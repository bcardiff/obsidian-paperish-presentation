import { Events, MarkdownView, Platform, Plugin, setTooltip } from 'obsidian';
import { DEFAULT_SETTINGS, PaperishPresentationSettings, PaperishPresentationSettingTab } from './settings';
import { PaperishPresentationView, VIEW_TYPE_PAPERISH_PRESENTATION } from './view';
import { PaperishOutlineView, VIEW_TYPE_PAPERISH_OUTLINE } from './outlineview';

/**
 * On macOS Ctrl+click is a secondary click, so the modifier differs by platform
 * rather than accepting either.
 */
const RESTART_MODIFIER = Platform.isMacOS ? '\u2318' : 'Ctrl';

function isRestartClick(evt: MouseEvent): boolean {
	return Platform.isMacOS ? evt.metaKey : evt.ctrlKey;
}

/**
 * The source line the reader is looking at. Reading mode has no cursor, so it
 * falls back to the topmost visible line — coarser, but it lands on the same
 * heading.
 */
function currentLine(view: MarkdownView): number {
	if (view.getMode() === 'source') return view.editor.getCursor().line;
	const scroll = (view.getEphemeralState() as { scroll?: unknown })?.scroll;
	return typeof scroll === 'number' ? Math.max(0, Math.floor(scroll)) : 0;
}

export default class PaperishPresentationPlugin extends Plugin {
	settings!: PaperishPresentationSettings;
	/** In-plugin bus: presentation views trigger 'pp-outline' on deck/position changes. */
	events = new Events();
	private presentActionEls: HTMLElement[] = [];

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_PAPERISH_PRESENTATION, (leaf) => new PaperishPresentationView(leaf, this));
		this.registerView(VIEW_TYPE_PAPERISH_OUTLINE, (leaf) => new PaperishOutlineView(leaf, this));

		this.addCommand({
			id: 'present-current-note',
			name: 'Present current note',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== 'md') return false;
				if (!checking) void this.openPresentation(file.path, 'top');
				return true;
			},
		});

		this.addCommand({
			id: 'present-current-note-from-here',
			name: 'Present current note from here',
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const file = view?.file;
				if (!view || !file || file.extension !== 'md') return false;
				if (!checking) void this.openPresentation(file.path, currentLine(view));
				return true;
			},
		});

		this.addCommand({
			id: 'refresh-presentation',
			name: 'Refresh presentation',
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(PaperishPresentationView);
				if (!view) return false;
				if (!checking) void view.refresh();
				return true;
			},
		});

		this.addCommand({
			id: 'open-slide-outline',
			name: 'Open slide outline',
			callback: () => void this.openSlideOutline(),
		});

		this.addSettingTab(new PaperishPresentationSettingTab(this.app, this));

		// A "Present this note" action in every markdown view's tab header.
		this.app.workspace.onLayoutReady(() => this.addPresentActions());
		this.registerEvent(this.app.workspace.on('layout-change', () => this.addPresentActions()));
	}

	onunload() {
		for (const el of this.presentActionEls) el.remove();
		this.presentActionEls = [];
	}

	private addPresentActions() {
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView)) continue;
			if (view.containerEl.querySelector('.pp-present-action')) continue;
			const el = view.addAction('presentation', this.presentActionTooltip(), (evt: MouseEvent) => {
				const file = view.file;
				if (!file) return;
				void this.openPresentation(file.path, isRestartClick(evt) ? 'top' : currentLine(view));
			});
			el.addClass('pp-present-action');
			// What the gestures do depends on whether a deck is up, and a deck can
			// open or close without this action being rebuilt — so re-read on hover.
			this.registerDomEvent(el, 'mouseenter', () => setTooltip(el, this.presentActionTooltip()));
			this.presentActionEls.push(el);
		}
	}

	private deckLeaf() {
		return this.app.workspace.getLeavesOfType(VIEW_TYPE_PAPERISH_PRESENTATION)[0];
	}

	private presentActionTooltip(): string {
		if (!this.deckLeaf()) return 'Click to present this note from the start';
		return `Click to jump presentation to current location\n${RESTART_MODIFIER}+Click to present from the top`;
	}

	async openSlideOutline() {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_PAPERISH_OUTLINE)[0];
		const leaf = existing ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) return;
		if (!existing) await leaf.setViewState({ type: VIEW_TYPE_PAPERISH_OUTLINE, active: true });
		void this.app.workspace.revealLeaf(leaf);
	}

	/**
	 * Reuses the open deck if there is one — presenting never piles up tabs.
	 * `start` says where to land: a source line, or 'top' for the first slide.
	 * It must be explicit, or a request aimed at the note already showing would
	 * take the no-op `setState` path and leave the deck where it stands.
	 */
	async openPresentation(filePath: string, start: number | 'top') {
		const existing = this.deckLeaf();
		const leaf = existing ?? this.app.workspace.getLeaf('tab');
		// A deck opened fresh always begins at the first slide: following the
		// cursor is navigation of a deck already up, not a way to start one.
		const state = { filePath, start: existing ? start : 'top' };
		// Jumping an open deck is done *from* the note, so the deck comes forward
		// but the caret stays where the writing is happening. Starting a deck, by
		// contrast, is where you want to be.
		const jumping = existing !== undefined && typeof start === 'number';
		const origin = jumping ? this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf : undefined;
		await leaf.setViewState({ type: VIEW_TYPE_PAPERISH_PRESENTATION, active: !jumping, state });
		await this.app.workspace.revealLeaf(leaf);
		if (origin) this.app.workspace.setActiveLeaf(origin, { focus: true });
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PaperishPresentationSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	notifySettingsChanged(breakAffecting: boolean, rerenderAffecting = false) {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_PAPERISH_PRESENTATION)) {
			if (leaf.view instanceof PaperishPresentationView)
				leaf.view.onSettingsChanged(breakAffecting, rerenderAffecting);
		}
	}
}
