import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PaperishPresentationSettings, PaperishPresentationSettingTab } from './settings';
import { PaperishPresentationView, VIEW_TYPE_PAPERISH_PRESENTATION } from './view';

export default class PaperishPresentationPlugin extends Plugin {
	settings!: PaperishPresentationSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_PAPERISH_PRESENTATION, (leaf) => new PaperishPresentationView(leaf, this));

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

		this.addSettingTab(new PaperishPresentationSettingTab(this.app, this));
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
