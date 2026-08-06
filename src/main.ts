import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PaperPresentSettings, PaperPresentSettingTab } from './settings';
import { PaperPresentView, VIEW_TYPE_PAPER_PRESENT } from './view';

export default class PaperPresentPlugin extends Plugin {
	settings!: PaperPresentSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_PAPER_PRESENT, (leaf) => new PaperPresentView(leaf, this));

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

		this.addSettingTab(new PaperPresentSettingTab(this.app, this));
	}

	async openPresentation(filePath: string) {
		const leaf = this.app.workspace.getLeaf('tab');
		await leaf.setViewState({ type: VIEW_TYPE_PAPER_PRESENT, active: true, state: { filePath } });
		void this.app.workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PaperPresentSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	notifySettingsChanged(breakAffecting: boolean) {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_PAPER_PRESENT)) {
			if (leaf.view instanceof PaperPresentView) leaf.view.onSettingsChanged(breakAffecting);
		}
	}
}
