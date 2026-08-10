import { ItemView, WorkspaceLeaf } from 'obsidian';
import type PaperishPresentationPlugin from './main';
import { PaperishPresentationView, VIEW_TYPE_PAPERISH_PRESENTATION } from './view';

export const VIEW_TYPE_PAPERISH_OUTLINE = 'paperish-outline-view';

/** Sidebar slide navigator (§6b). Owns no state: pulls from the first open
 *  presentation view and re-renders on the plugin's 'pp-outline' event bus. */
export class PaperishOutlineView extends ItemView {
	private plugin: PaperishPresentationPlugin;
	private listEl!: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: PaperishPresentationPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.navigation = false;
	}

	getViewType(): string {
		return VIEW_TYPE_PAPERISH_OUTLINE;
	}

	getDisplayText(): string {
		return 'Slide outline';
	}

	getIcon(): string {
		return 'list';
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass('pp-outline');
		this.listEl = this.contentEl.createDiv({ cls: 'pp-outline-list' });
		this.registerEvent(this.plugin.events.on('pp-outline', () => this.render()));
		// Catches presentations opening/closing, which fire no pp-outline event.
		this.registerEvent(this.app.workspace.on('layout-change', () => this.render()));
		this.render();
	}

	private findPresentation(): PaperishPresentationView | null {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_PAPERISH_PRESENTATION)) {
			if (leaf.view instanceof PaperishPresentationView) return leaf.view;
		}
		return null;
	}

	private render(): void {
		this.listEl.empty();
		const presentation = this.findPresentation();
		if (!presentation) {
			this.listEl.createDiv({ cls: 'pp-outline-empty', text: 'No presentation open.' });
			return;
		}
		const current = presentation.currentSlideIndex();
		for (const item of presentation.getOutline()) {
			const row = this.listEl.createDiv({ cls: 'pp-outline-item', text: item.label });
			row.style.setProperty('--pp-outline-indent', String(item.indent));
			row.toggleClass('pp-outline-snippet', item.isSnippet);
			row.toggleClass('is-active', item.index === current);
			row.addEventListener('click', () => {
				// Jump before activating: activation can trigger a refresh-on-focus,
				// which restores the position captured at that moment.
				presentation.jumpTo(item.index);
				this.app.workspace.setActiveLeaf(presentation.leaf, { focus: true });
			});
		}
	}
}
