import { Component, ItemView, MarkdownRenderer, Scope, TFile, ViewStateResult, WorkspaceLeaf } from 'obsidian';
import type PaperPresentPlugin from './main';
import { partition, PartitionOptions, Slide } from './partition';
import { applyPosition, DeckPosition, first, last, next, prev } from './reveal';

export const VIEW_TYPE_PAPER_PRESENT = 'paper-present-view';

export class PaperPresentView extends ItemView {
	private plugin: PaperPresentPlugin;
	private filePath: string | null = null;
	private slides: Slide[] = [];
	private pos: DeckPosition = first();
	private barEl!: HTMLElement;
	private contentContainer!: HTMLElement;
	private renderContainer!: HTMLElement;
	private progressEl!: HTMLElement;
	private renderComponent: Component | null = null;
	private renderSeq = 0;

	constructor(leaf: WorkspaceLeaf, plugin: PaperPresentPlugin) {
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
			this.setPos(first());
			return false;
		});
		this.scope.register([], 'End', () => {
			this.setPos(last(this.slides));
			return false;
		});
		this.scope.register([], 'Escape', () => this.handleEscape());
	}

	getViewType(): string {
		return VIEW_TYPE_PAPER_PRESENT;
	}

	getDisplayText(): string {
		const name = this.filePath?.split('/').pop()?.replace(/\.md$/, '');
		return name ? `Present: ${name}` : 'Paper Present';
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
		const root = this.contentEl;
		root.empty();
		root.addClass('paper-present');
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
			if (target.closest('a, button, input, textarea, video, audio, iframe, summary')) return;
			this.advance();
		});
	}

	async onClose(): Promise<void> {
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
		root.toggleClass('pp-force-dark', s.colorScheme === 'dark');
		root.toggleClass('pp-force-light', s.colorScheme === 'light');
		root.setAttribute('data-pp-unrevealed', s.unrevealedStyle);
		root.setAttribute('data-pp-valign', s.verticalAlign);
	}

	private async renderFile(): Promise<void> {
		const file = this.filePath ? this.app.vault.getFileByPath(this.filePath) : null;
		if (!(file instanceof TFile)) return;

		const seq = ++this.renderSeq;

		this.contentEl.addClass('pp-loading');
		if (this.renderComponent) this.removeChild(this.renderComponent);
		this.renderComponent = new Component();
		this.addChild(this.renderComponent);
		this.renderContainer.empty();

		let markdown = await this.app.vault.cachedRead(file);
		if (seq !== this.renderSeq) return;
		const fmPos = this.app.metadataCache.getFileCache(file)?.frontmatterPosition;
		if (fmPos) markdown = markdown.slice(fmPos.end.offset).replace(/^\s+/, '');

		await MarkdownRenderer.render(this.app, markdown, this.renderContainer, file.path, this.renderComponent);
		if (seq !== this.renderSeq) return;

		this.repartition();
		this.pos = first();
		applyPosition(this.slides, this.pos);
		this.contentEl.removeClass('pp-loading');
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

	private setPos(pos: DeckPosition): void {
		const slideChanged = pos.slide !== this.pos.slide;
		this.pos = pos;
		applyPosition(this.slides, pos);
		if (slideChanged) this.contentContainer.scrollTop = 0;
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
		this.leaf.detach();
	}
}
