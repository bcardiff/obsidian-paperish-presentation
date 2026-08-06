import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PaperPresentSettings } from './settings';

export default class PaperPresentPlugin extends Plugin {
	settings!: PaperPresentSettings;

	async onload() {
		await this.loadSettings();
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
}
