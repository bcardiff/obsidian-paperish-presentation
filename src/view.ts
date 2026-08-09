import { Component, ItemView, MarkdownRenderer, Scope, TFile, ViewStateResult, WorkspaceLeaf } from 'obsidian';
import type PaperishPresentationPlugin from './main';
import { partition, PartitionOptions, Slide } from './partition';
import {
	anchorOf,
	applyPosition,
	DeckPosition,
	entryStep,
	findSlideBySignature,
	first,
	last,
	next,
	positionForAnchor,
	prev,
	slideSignature,
} from './reveal';
import { buildTrailContent, trailsEqual } from './contextbar';

export const VIEW_TYPE_PAPERISH_PRESENTATION = 'paperish-presentation-view';

export class PaperishPresentationView extends ItemView {
	private plugin: PaperishPresentationPlugin;
	private filePath: string | null = null;
	private slides: Slide[] = [];
	private pos: DeckPosition = { slide: 0, step: -1 };
	private barEl!: HTMLElement;
	private contentContainer!: HTMLElement;
	private renderContainer!: HTMLElement;
	private progressEl!: HTMLElement;
	private renderComponent: Component | null = null;
	private renderSeq = 0;
	private observer: MutationObserver | null = null;
	private repartitionTimer: number | null = null;
	private barSwapTimer: number | null = null;
	private lastTrail: HTMLElement[] = [];
	private appliedExtraClasses: string[] = [];
	private sourceDirty = false;
	private stuckRaf: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: PaperishPresentationPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.navigation = true;
		this.scope = new Scope(this.app.scope);
		for (const key of ['ArrowRight', 'ArrowDown', ' ', 'PageDown']) {
			this.scope.register([], key, () => this.advance());
		}
		for (const key of ['ArrowLeft', 'ArrowUp', 'PageUp']) {
			this.scope.register([], key, () => this.back());
		}
		this.scope.register(['Shift'], ' ', () => this.back());
		this.scope.register([], 'Home', () => {
			this.setPos(first(this.slides));
			return false;
		});
		this.scope.register([], 'End', () => {
			this.setPos(last(this.slides));
			return false;
		});
		this.scope.register([], 'Escape', () => this.handleEscape());
		this.scope.register([], 'f', () => this.toggleFullscreen());
		this.scope.register([], 'r', () => {
			void this.refresh();
			return false;
		});
	}

	getViewType(): string {
		return VIEW_TYPE_PAPERISH_PRESENTATION;
	}

	getDisplayText(): string {
		const name = this.filePath?.split('/').pop()?.replace(/\.md$/, '');
		return name ? `Present: ${name}` : 'Paperish Presentation';
	}

	getIcon(): string {
		return 'presentation';
	}

	getState(): Record<string, unknown> {
		return { filePath: this.filePath };
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		await super.setState(state, result);
		const filePath = (state as { filePath?: unknown })?.filePath;
		if (typeof filePath === 'string' && filePath !== this.filePath) {
			this.filePath = filePath;
			if (this.renderContainer) await this.renderFile();
		}
	}

	async onOpen(): Promise<void> {
		this.addAction('refresh-cw', 'Refresh presentation', () => void this.refresh());
		const root = this.contentEl;
		root.empty();
		root.addClass('paperish-presentation');
		this.barEl = root.createDiv({ cls: 'pp-context-bar' });
		this.contentContainer = root.createDiv({ cls: 'pp-content' });
		this.renderContainer = this.contentContainer.createDiv({
			cls: 'pp-doc markdown-rendered markdown-preview-view',
		});
		this.progressEl = root.createDiv({ cls: 'pp-progress' });
		this.applySettings();
		if (this.filePath) await this.renderFile();
		this.registerDomEvent(this.contentContainer, 'click', (evt: MouseEvent) => {
			if (!this.plugin.settings.advanceOnClick) return;
			if (window.getSelection()?.toString()) return; // don't fight text selection (§7)
			const target = evt.target as HTMLElement;
			// A detached target means an interactive element already handled this click
			// and mutated the DOM mid-propagation (e.g. the code-block copy button swaps
			// its icon), leaving closest() blind to its ancestry — never a navigation click.
			if (!target.isConnected) return;
			if (target.closest('a, button, input, textarea, video, audio, iframe, summary')) return;
			// Expanding/collapsing a callout is not a navigation gesture (§7).
			if (target.closest('.callout.is-collapsible .callout-title')) return;
			// Clicking a dimmed neighbor slide jumps to it (§12.2).
			const slideEl = target.closest('[data-pp-slide]');
			if (slideEl) {
				const idx = Number(slideEl.getAttribute('data-pp-slide'));
				if (Number.isFinite(idx) && idx !== this.pos.slide) {
					const s = this.slides[idx];
					const step = idx < this.pos.slide ? (s?.fragments.length ?? 0) - 1 : entryStep(s);
					this.setPos({ slide: idx, step });
					return;
				}
			}
			this.advance();
		});
		this.registerDomEvent(this.contentContainer, 'scroll', () => {
			if (this.stuckRaf !== null) return;
			this.stuckRaf = window.requestAnimationFrame(() => {
				this.stuckRaf = null;
				this.updateStuckHeading();
			});
		});
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file.path === this.filePath) this.sourceDirty = true;
			}),
		);
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf === this.leaf && this.sourceDirty && this.plugin.settings.refreshOnFocus) {
					void this.refresh();
				}
			}),
		);
		const fsBtn = this.contentEl.createEl('button', { cls: 'pp-fullscreen-btn', attr: { 'aria-label': 'Toggle fullscreen' } });
		fsBtn.setText('⛶');
		if (!this.containerEl.requestFullscreen) fsBtn.hide();
		this.registerDomEvent(fsBtn, 'click', (evt) => {
			evt.stopPropagation();
			this.toggleFullscreen();
		});
	}

	onResize(): void {
		// Layout reflows via CSS, but the scroll anchoring depends on the viewport
		// height (§12.2) — re-center the current position and refresh pp-stuck.
		this.scrollToCurrent(false);
	}

	async onClose(): Promise<void> {
		this.stopObserver();
		if (this.barSwapTimer !== null) {
			window.clearTimeout(this.barSwapTimer);
			this.barSwapTimer = null;
		}
		if (this.stuckRaf !== null) {
			window.cancelAnimationFrame(this.stuckRaf);
			this.stuckRaf = null;
		}
		if (this.renderComponent) this.removeChild(this.renderComponent);
		this.renderComponent = null;
	}

	applySettings(): void {
		const s = this.plugin.settings;
		const root = this.contentEl;
		root.style.setProperty('--pp-font-scale', String(s.fontScale));
		root.style.setProperty('--pp-max-width', `${s.maxWidth}rem`);
		root.toggleClass('pp-bar-top', s.contextBarPosition === 'top');
		root.toggleClass('pp-bar-bottom', s.contextBarPosition === 'bottom');
		root.toggleClass('pp-bar-off', s.contextBarContent === 'off');
		root.toggleClass('pp-full-bleed', s.fullBleedMedia);
		root.toggleClass('pp-sticky-headings', s.stickyHeadings);
		this.updateStuckHeading(); // clears a stale pp-stuck when the toggle turns off
		root.toggleClass('pp-force-dark', s.colorScheme === 'dark');
		root.toggleClass('pp-force-light', s.colorScheme === 'light');
		root.setAttribute('data-pp-unrevealed', s.unrevealedStyle);
		root.setAttribute('data-pp-valign', s.verticalAlign);
		const extra = this.plugin.settings.extraClasses.split(/\s+/).filter((c) => c.length > 0);
		for (const c of this.appliedExtraClasses) this.contentEl.removeClass(c);
		for (const c of extra) this.contentEl.addClass(c);
		this.appliedExtraClasses = extra;
	}

	private displayedTrail(): HTMLElement[] {
		const s = this.plugin.settings;
		const slide = this.slides[this.pos.slide];
		if (!slide || s.contextBarContent === 'off') return [];
		const trail = [...slide.trail];
		if (s.contextBarContent === 'ancestors-current' && slide.ownHeading) trail.push(slide.ownHeading);
		return trail;
	}

	private updateContextBar(): void {
		const trail = this.displayedTrail();
		if (trailsEqual(trail, this.lastTrail)) return; // no flicker when unchanged (§6)
		this.lastTrail = trail;
		const swap = () => {
			this.barSwapTimer = null;
			this.barEl.empty();
			this.barEl.appendChild(buildTrailContent(trail));
			this.barEl.removeClass('pp-bar-fading');
		};
		if (this.barEl.childElementCount === 0) {
			swap(); // nothing to fade from
		} else {
			this.barEl.addClass('pp-bar-fading');
			if (this.barSwapTimer !== null) window.clearTimeout(this.barSwapTimer);
			this.barSwapTimer = window.setTimeout(swap, 120); // matches the CSS transition duration
		}
	}

	/**
	 * Re-render the current file and restore the position via heading
	 * signature (§10.8) — element identity does not survive a re-render.
	 */
	async refresh(): Promise<void> {
		if (!this.filePath || this.slides.length === 0) {
			await this.renderFile();
			return;
		}
		const sig = slideSignature(this.slides, this.pos.slide);
		const step = this.pos.step;
		await this.renderFile();
		if (this.slides.length === 0) return;
		const slide = findSlideBySignature(this.slides, sig);
		const fragments = this.slides[slide]?.fragments.length ?? 0;
		this.pos = { slide, step: Math.max(-1, Math.min(step, fragments - 1)) };
		applyPosition(this.slides, this.pos);
		this.updateContextBar();
		this.updateProgress();
		this.scrollToCurrent(false);
	}

	private async renderFile(): Promise<void> {
		this.stopObserver();
		this.sourceDirty = false;
		const file = this.filePath ? this.app.vault.getFileByPath(this.filePath) : null;
		if (!(file instanceof TFile)) return;

		const seq = ++this.renderSeq;

		this.contentEl.addClass('pp-loading');
		if (this.renderComponent) this.removeChild(this.renderComponent);
		this.renderComponent = new Component();
		this.addChild(this.renderComponent);
		this.renderContainer.empty();

		try {
			let markdown = await this.app.vault.cachedRead(file);
			if (seq !== this.renderSeq) return;
			const fmPos = this.app.metadataCache.getFileCache(file)?.frontmatterPosition;
			if (fmPos) markdown = markdown.slice(fmPos.end.offset).replace(/^\s+/, '');

			await MarkdownRenderer.render(this.app, markdown, this.renderContainer, file.path, this.renderComponent);
			if (seq !== this.renderSeq) return;

			this.repartition();
			this.pos = first(this.slides);
			applyPosition(this.slides, this.pos);
			this.updateContextBar();
			this.updateProgress();
			this.scrollToCurrent(false);
			this.startObserver();
		} finally {
			if (seq === this.renderSeq) this.contentEl.removeClass('pp-loading');
		}
	}

	private repartition(): void {
		this.slides = partition(this.renderContainer, this.partitionOptions());
	}

	private partitionOptions(): PartitionOptions {
		const s = this.plugin.settings;
		const file = this.filePath ? this.app.vault.getFileByPath(this.filePath) : null;
		const fm = file ? this.app.metadataCache.getFileCache(file)?.frontmatter : undefined;
		const raw = typeof fm?.['slides-break'] === 'string' ? fm['slides-break'].toLowerCase() : null;
		const breakLevel = raw === 'h1' ? 1 : raw === 'h2' ? 2 : raw === 'h3' ? 3 : s.breakLevel;
		return { breakLevel, hrBreaks: s.hrBreaks, revealMode: s.revealMode };
	}

	private startObserver(): void {
		this.stopObserver();
		this.observer = new MutationObserver((mutations) => {
			const relevant = mutations.some(
				(m) =>
					m.target === this.renderContainer ||
					// list-items mode: li added/removed inside a top-level list changes fragments
					(this.plugin.settings.revealMode === 'list-items' &&
						m.target.instanceOf(HTMLElement) &&
						m.target.parentElement === this.renderContainer &&
						(m.target.tagName === 'UL' || m.target.tagName === 'OL')),
			);
			if (relevant) this.scheduleRepartition();
		});
		this.observer.observe(this.renderContainer, { childList: true, subtree: true });
	}

	private stopObserver(): void {
		this.observer?.disconnect();
		this.observer = null;
		if (this.repartitionTimer !== null) {
			window.clearTimeout(this.repartitionTimer);
			this.repartitionTimer = null;
		}
	}

	private scheduleRepartition(): void {
		if (this.repartitionTimer !== null) window.clearTimeout(this.repartitionTimer);
		this.repartitionTimer = window.setTimeout(() => {
			this.repartitionTimer = null;
			this.repartitionPreservingPosition();
		}, 150); // debounce (§2: 100–250ms)
	}

	repartitionPreservingPosition(): void {
		const anchor = anchorOf(this.slides, this.pos);
		this.repartition();
		this.pos = positionForAnchor(this.slides, anchor, this.pos);
		applyPosition(this.slides, this.pos);
		this.updateContextBar();
		this.updateProgress();
		this.scrollToCurrent(false); // content may have shifted; re-anchor without animation
	}

	onSettingsChanged(breakAffecting: boolean): void {
		this.applySettings();
		if (breakAffecting) {
			this.repartitionPreservingPosition();
		} else {
			applyPosition(this.slides, this.pos);
			this.updateContextBar();
			this.updateProgress();
			this.scrollToCurrent(false); // e.g. verticalAlign changed
		}
	}

	private setPos(pos: DeckPosition): void {
		const slideChanged = pos.slide !== this.pos.slide;
		const stepChanged = pos.step !== this.pos.step;
		this.pos = pos;
		applyPosition(this.slides, pos);
		this.updateProgress();
		if (slideChanged || stepChanged) this.scrollToCurrent(true);
		if (slideChanged) this.updateContextBar();
	}

	/** Offset of el relative to renderContainer, across nested offset contexts
	 *  (list-items fragments live inside their list, not at the top level). */
	private offsetWithinDoc(el: HTMLElement): number {
		let y = 0;
		let n: HTMLElement | null = el;
		while (n && n !== this.renderContainer) {
			y += n.offsetTop;
			const parent: Element | null = n.offsetParent;
			n = parent && parent.instanceOf(HTMLElement) ? parent : null;
		}
		return y;
	}

	/** Scroll the current slide to the viewport position given by verticalAlign (§12.2).
	 *  Slides taller than the viewport follow the current fragment instead, so
	 *  stepping scrolls earlier content up and centers the newly revealed element. */
	private scrollToCurrent(smooth: boolean): void {
		const slide = this.slides[this.pos.slide];
		const els = slide?.elements;
		if (!slide || !els || els.length === 0) return;
		const firstEl = els[0]!;
		const lastEl = els[els.length - 1]!;
		const docTop = this.renderContainer.offsetTop;
		const top = docTop + firstEl.offsetTop;
		const bottom = docTop + lastEl.offsetTop + lastEl.offsetHeight;
		const viewport = this.contentContainer.clientHeight;
		const topAligned = top - Math.min(48, viewport * 0.06);
		const frag = slide.fragments[this.pos.step];
		let target: number;
		if (bottom - top <= viewport) {
			target = this.plugin.settings.verticalAlign === 'center' ? (top + bottom) / 2 - viewport / 2 : topAligned;
		} else if (frag) {
			// Center the current fragment, clamped so entering the slide never
			// starts below its top; huge fragments align to their own top.
			const fragTop = docTop + this.offsetWithinDoc(frag);
			target =
				frag.offsetHeight >= viewport
					? fragTop - Math.min(48, viewport * 0.06)
					: Math.max(topAligned, fragTop + frag.offsetHeight / 2 - viewport / 2);
		} else {
			target = topAligned;
		}
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		this.contentContainer.scrollTo({
			top: Math.max(0, target),
			behavior: smooth && !reduced ? 'smooth' : 'auto',
		});
		this.updateStuckHeading(); // best-effort now; the scroll listener tracks the rest
	}

	/** Styling hook (§9): CSS cannot tell a sticky element in flow from a pinned
	 *  one, so pp-stuck is toggled here. Rect comparison is stable while pinned —
	 *  the pinned position is constant, so this cannot oscillate. */
	private updateStuckHeading(): void {
		const heading = this.slides[this.pos.slide]?.ownHeading;
		if (!heading) return;
		const stuck =
			this.plugin.settings.stickyHeadings &&
			heading.getBoundingClientRect().top <= this.contentContainer.getBoundingClientRect().top + 1;
		heading.classList.toggle('pp-stuck', stuck);
	}

	private toggleFullscreen(): false {
		if (!this.containerEl.requestFullscreen) return false; // unsupported (mobile) — no-op (§7)
		if (document.fullscreenElement) {
			void document.exitFullscreen();
		} else {
			void this.containerEl.requestFullscreen();
		}
		return false;
	}

	private updateProgress(): void {
		const mode = this.plugin.settings.progressIndicator;
		this.progressEl.setAttribute('data-mode', mode);
		if (mode === 'bar') {
			const pct = this.slides.length > 0 ? ((this.pos.slide + 1) / this.slides.length) * 100 : 0;
			this.progressEl.style.setProperty('--pp-progress', `${pct}%`);
			this.progressEl.setText('');
		} else if (mode === 'counter') {
			this.progressEl.setText(`${this.pos.slide + 1} / ${this.slides.length}`);
		} else {
			this.progressEl.setText('');
		}
	}

	private advance(): false {
		this.setPos(next(this.slides, this.pos));
		return false;
	}

	private back(): false {
		this.setPos(prev(this.slides, this.pos));
		return false;
	}

	private handleEscape(): false {
		if (document.fullscreenElement) return false; // browser exits fullscreen on this press
		if (this.plugin.settings.escBehavior === 'source') {
			void this.returnToSource();
		} else {
			this.leaf.detach();
		}
		return false;
	}

	private async returnToSource(): Promise<void> {
		const path = this.filePath;
		const heading = this.slides[this.pos.slide]?.ownHeading;
		const headingText = heading?.getAttribute('data-heading') ?? heading?.textContent?.trim() ?? '';
		if (path) {
			const linktext = headingText ? `${path}#${headingText}` : path;
			await this.app.workspace.openLinkText(linktext, '', false);
		}
		// openLinkText(..., false) reuses the active leaf when possible, which is this
		// presentation leaf — it now hosts the opened note and this.leaf.view !== this.
		// Only detach if our leaf still shows the presentation view (i.e. the note was
		// opened elsewhere); otherwise detaching would destroy the leaf now showing the note.
		if (this.leaf.view === this) this.leaf.detach();
	}
}
