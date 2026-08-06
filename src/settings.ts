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
