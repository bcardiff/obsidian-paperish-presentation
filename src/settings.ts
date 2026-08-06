import { App, PluginSettingTab, Setting } from 'obsidian';
import type PaperPresentPlugin from './main';

export type BreakLevel = 1 | 2 | 3;
export type RevealMode = 'none' | 'blocks' | 'list-items';
export type UnrevealedStyle = 'dimmed' | 'hidden';
export type ContextBarContent = 'off' | 'ancestors' | 'ancestors-current';
export type ContextBarPosition = 'top' | 'bottom';
export type VerticalAlign = 'top' | 'center';
export type ColorScheme = 'vault' | 'light' | 'dark';
export type ProgressIndicator = 'none' | 'bar' | 'counter';
export type EscBehavior = 'close' | 'source';

export interface PaperPresentSettings {
	breakLevel: BreakLevel;
	hrBreaks: boolean;
	revealMode: RevealMode;
	unrevealedStyle: UnrevealedStyle;
	contextBarContent: ContextBarContent;
	contextBarPosition: ContextBarPosition;
	fontScale: number;
	maxWidth: number;
	verticalAlign: VerticalAlign;
	fullBleedMedia: boolean;
	colorScheme: ColorScheme;
	advanceOnClick: boolean;
	progressIndicator: ProgressIndicator;
	escBehavior: EscBehavior;
	extraClasses: string;
}

export const DEFAULT_SETTINGS: PaperPresentSettings = {
	breakLevel: 2,
	hrBreaks: true,
	revealMode: 'blocks',
	unrevealedStyle: 'dimmed',
	contextBarContent: 'ancestors',
	contextBarPosition: 'bottom',
	fontScale: 1.4,
	maxWidth: 42,
	verticalAlign: 'top',
	fullBleedMedia: true,
	colorScheme: 'vault',
	advanceOnClick: true,
	progressIndicator: 'bar',
	escBehavior: 'source',
	extraClasses: '',
};

export class PaperPresentSettingTab extends PluginSettingTab {
	plugin: PaperPresentPlugin;

	constructor(app: App, plugin: PaperPresentPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const s = this.plugin.settings;
		const update = async (breakAffecting: boolean) => {
			await this.plugin.saveSettings();
			this.plugin.notifySettingsChanged(breakAffecting);
		};

		new Setting(containerEl)
			.setName('Break level')
			.setDesc('Headings at this level or shallower start a new slide. Per-note override: slides-break frontmatter (h1/h2/h3).')
			.addDropdown((d) =>
				d
					.addOptions({ '1': 'H1', '2': 'H2', '3': 'H3' })
					.setValue(String(s.breakLevel))
					.onChange(async (v) => {
						s.breakLevel = Number(v) as BreakLevel;
						await update(true);
					}),
			);

		new Setting(containerEl).setName('Horizontal rule forces slide break').addToggle((t) =>
			t.setValue(s.hrBreaks).onChange(async (v) => {
				s.hrBreaks = v;
				await update(true);
			}),
		);

		new Setting(containerEl).setName('Reveal mode').addDropdown((d) =>
			d
				.addOptions({ none: 'None', blocks: 'Blocks', 'list-items': 'List items' })
				.setValue(s.revealMode)
				.onChange(async (v) => {
					s.revealMode = v as RevealMode;
					await update(true);
				}),
		);

		new Setting(containerEl).setName('Un-revealed style').addDropdown((d) =>
			d
				.addOptions({ dimmed: 'Dimmed', hidden: 'Hidden' })
				.setValue(s.unrevealedStyle)
				.onChange(async (v) => {
					s.unrevealedStyle = v as UnrevealedStyle;
					await update(false);
				}),
		);

		new Setting(containerEl).setName('Context bar content').addDropdown((d) =>
			d
				.addOptions({ off: 'Off', ancestors: 'Ancestors', 'ancestors-current': 'Ancestors + current heading' })
				.setValue(s.contextBarContent)
				.onChange(async (v) => {
					s.contextBarContent = v as ContextBarContent;
					await update(false);
				}),
		);

		new Setting(containerEl).setName('Context bar position').addDropdown((d) =>
			d
				.addOptions({ top: 'Top', bottom: 'Bottom' })
				.setValue(s.contextBarPosition)
				.onChange(async (v) => {
					s.contextBarPosition = v as ContextBarPosition;
					await update(false);
				}),
		);

		new Setting(containerEl).setName('Font scale').addSlider((sl) =>
			sl
				.setLimits(1.0, 2.5, 0.1)
				.setValue(s.fontScale)
				.setDynamicTooltip()
				.onChange(async (v) => {
					s.fontScale = v;
					await update(false);
				}),
		);

		new Setting(containerEl)
			.setName('Content max width')
			.setDesc('In rem.')
			.addText((t) =>
				t.setValue(String(s.maxWidth)).onChange(async (v) => {
					const n = Number(v);
					if (Number.isFinite(n) && n >= 10) {
						s.maxWidth = n;
						await update(false);
					}
				}),
			);

		new Setting(containerEl).setName('Vertical alignment').addDropdown((d) =>
			d
				.addOptions({ top: 'Top', center: 'Center' })
				.setValue(s.verticalAlign)
				.onChange(async (v) => {
					s.verticalAlign = v as VerticalAlign;
					await update(false);
				}),
		);

		new Setting(containerEl).setName('Full-bleed media').addToggle((t) =>
			t.setValue(s.fullBleedMedia).onChange(async (v) => {
				s.fullBleedMedia = v;
				await update(false);
			}),
		);

		new Setting(containerEl).setName('Color scheme').addDropdown((d) =>
			d
				.addOptions({ vault: 'Follow vault', light: 'Force light', dark: 'Force dark' })
				.setValue(s.colorScheme)
				.onChange(async (v) => {
					s.colorScheme = v as ColorScheme;
					await update(false);
				}),
		);

		new Setting(containerEl).setName('Advance on click/tap').addToggle((t) =>
			t.setValue(s.advanceOnClick).onChange(async (v) => {
				s.advanceOnClick = v;
				await update(false);
			}),
		);

		new Setting(containerEl).setName('Progress indicator').addDropdown((d) =>
			d
				.addOptions({ none: 'None', bar: 'Bar', counter: 'Counter' })
				.setValue(s.progressIndicator)
				.onChange(async (v) => {
					s.progressIndicator = v as ProgressIndicator;
					await update(false);
				}),
		);

		new Setting(containerEl).setName('Esc behavior').addDropdown((d) =>
			d
				.addOptions({ close: 'Close', source: 'Return to source' })
				.setValue(s.escBehavior)
				.onChange(async (v) => {
					s.escBehavior = v as EscBehavior;
					await update(false);
				}),
		);

		new Setting(containerEl)
			.setName('Extra container classes')
			.setDesc('Space-separated classes added to the presentation container, for CSS snippets.')
			.addText((t) =>
				t.setValue(s.extraClasses).onChange(async (v) => {
					s.extraClasses = v;
					await update(false);
				}),
			);
	}
}
