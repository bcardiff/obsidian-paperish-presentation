import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import type PaperishPresentationPlugin from './main';

export type BreakLevel = 1 | 2 | 3;
export type RevealMode = 'none' | 'blocks' | 'list-items';
export type UnrevealedStyle = 'dimmed' | 'hidden';
export type ContextBarContent = 'off' | 'ancestors' | 'ancestors-current';
export type ContextBarPosition = 'top' | 'bottom';
export type VerticalAlign = 'top' | 'center';
export type ColorScheme = 'vault' | 'light' | 'dark';
export type ProgressIndicator = 'none' | 'bar' | 'counter';
export type EscBehavior = 'close' | 'source';

export interface PaperishPresentationSettings {
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
	refreshOnFocus: boolean;
	extraClasses: string;
}

export const DEFAULT_SETTINGS: PaperishPresentationSettings = {
	breakLevel: 2,
	hrBreaks: true,
	revealMode: 'blocks',
	unrevealedStyle: 'dimmed',
	contextBarContent: 'ancestors',
	contextBarPosition: 'bottom',
	fontScale: 1.4,
	maxWidth: 42,
	verticalAlign: 'center',
	fullBleedMedia: true,
	colorScheme: 'vault',
	advanceOnClick: true,
	progressIndicator: 'bar',
	escBehavior: 'source',
	refreshOnFocus: true,
	extraClasses: '',
};

export class PaperishPresentationSettingTab extends PluginSettingTab {
	plugin: PaperishPresentationPlugin;

	constructor(app: App, plugin: PaperishPresentationPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Break level',
				desc: 'Headings at this level or shallower start a new slide. Per-note override: slides-break frontmatter (h1/h2/h3).',
				control: { type: 'dropdown', key: 'breakLevel', options: { '1': 'H1', '2': 'H2', '3': 'H3' } },
			},
			{
				name: 'Horizontal rule forces slide break',
				control: { type: 'toggle', key: 'hrBreaks' },
			},
			{
				name: 'Reveal mode',
				control: { type: 'dropdown', key: 'revealMode', options: { none: 'None', blocks: 'Blocks', 'list-items': 'List items' } },
			},
			{
				name: 'Un-revealed style',
				control: { type: 'dropdown', key: 'unrevealedStyle', options: { dimmed: 'Dimmed', hidden: 'Hidden' } },
			},
			{
				name: 'Context bar content',
				control: {
					type: 'dropdown',
					key: 'contextBarContent',
					options: { off: 'Off', ancestors: 'Ancestors', 'ancestors-current': 'Ancestors + current heading' },
				},
			},
			{
				name: 'Context bar position',
				control: { type: 'dropdown', key: 'contextBarPosition', options: { top: 'Top', bottom: 'Bottom' } },
			},
			{
				name: 'Font scale',
				control: { type: 'slider', key: 'fontScale', min: 1.0, max: 2.5, step: 0.1 },
			},
			{
				name: 'Content max width',
				desc: 'In rem.',
				control: { type: 'number', key: 'maxWidth', min: 10 },
			},
			{
				name: 'Vertical alignment',
				control: { type: 'dropdown', key: 'verticalAlign', options: { top: 'Top', center: 'Center' } },
			},
			{
				name: 'Full-bleed media',
				control: { type: 'toggle', key: 'fullBleedMedia' },
			},
			{
				name: 'Color scheme',
				control: { type: 'dropdown', key: 'colorScheme', options: { vault: 'Follow vault', light: 'Force light', dark: 'Force dark' } },
			},
			{
				name: 'Advance on click/tap',
				control: { type: 'toggle', key: 'advanceOnClick' },
			},
			{
				name: 'Progress indicator',
				control: { type: 'dropdown', key: 'progressIndicator', options: { none: 'None', bar: 'Bar', counter: 'Counter' } },
			},
			{
				name: 'Esc behavior',
				control: { type: 'dropdown', key: 'escBehavior', options: { close: 'Close', source: 'Return to source' } },
			},
			{
				name: 'Refresh when the presentation regains focus',
				desc: 'Re-render if the note changed while you were away. Manual refresh is always available via the r key or the command palette.',
				control: { type: 'toggle', key: 'refreshOnFocus' },
			},
			{
				name: 'Extra container classes',
				desc: 'Space-separated classes added to the presentation container, for CSS snippets.',
				control: { type: 'text', key: 'extraClasses' },
			},
		];
	}

	// breakLevel is stored as a number but driven by a dropdown (string values).
	getControlValue(key: string): unknown {
		const value = super.getControlValue(key);
		return key === 'breakLevel' ? String(value) : value;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		await super.setControlValue(key, key === 'breakLevel' ? Number(value) : value);
		const breakAffecting = key === 'breakLevel' || key === 'hrBreaks' || key === 'revealMode';
		this.plugin.notifySettingsChanged(breakAffecting);
	}
}
