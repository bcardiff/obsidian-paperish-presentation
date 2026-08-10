import { Events, MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PaperishPresentationSettings, PaperishPresentationSettingTab } from './settings';
import { PaperishPresentationView, VIEW_TYPE_PAPERISH_PRESENTATION } from './view';
import { PaperishOutlineView, VIEW_TYPE_PAPERISH_OUTLINE } from './outlineview';

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
				if (!checking) void this.openPresentation(file.path);
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
			const el = view.addAction('presentation', 'Present this note', () => {
				const file = view.file;
				if (file) void this.openPresentation(file.path);
			});
			el.addClass('pp-present-action');
			this.presentActionEls.push(el);
		}
	}

	async openSlideOutline() {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_PAPERISH_OUTLINE)[0];
		const leaf = existing ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) return;
		if (!existing) await leaf.setViewState({ type: VIEW_TYPE_PAPERISH_OUTLINE, active: true });
		void this.app.workspace.revealLeaf(leaf);
	}

	async openPresentation(filePath: string) {
		const leaf = this.app.workspace.getLeaf('tab');
		await leaf.setViewState({ type: VIEW_TYPE_PAPERISH_PRESENTATION, active: true, state: { filePath } });
		void this.app.workspace.revealLeaf(leaf);
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

	notifySettingsChanged(breakAffecting: boolean) {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_PAPERISH_PRESENTATION)) {
			if (leaf.view instanceof PaperishPresentationView) leaf.view.onSettingsChanged(breakAffecting);
		}
	}
}
