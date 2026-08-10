import type { Slide } from './partition';

export interface OutlineItem {
	index: number;
	label: string;
	indent: number;
	isSnippet: boolean; // heading-less content slide — rendered muted
}

const SNIPPET_MAX = 40;

function headingLabel(h: HTMLElement): string {
	return h.getAttribute('data-heading') ?? h.textContent?.trim() ?? '';
}

/** One row per slide, so the outline maps 1:1 to what navigation does (§6b).
 *  Indent comes from the trail: ancestors for heading slides, the full trail in
 *  effect for heading-less ones — they nest under the section they continue. */
export function outlineItems(slides: Slide[]): OutlineItem[] {
	return slides.map((s) => {
		if (s.ownHeading) {
			return { index: s.index, label: headingLabel(s.ownHeading), indent: s.trail.length, isSnippet: false };
		}
		const first = s.elements[0];
		if (first?.hasAttribute('data-pp-cover')) {
			const title = first.querySelector('.pp-cover-title')?.textContent?.trim();
			return { index: s.index, label: title || 'Cover', indent: 0, isSnippet: false };
		}
		let text = first?.textContent?.trim().replace(/\s+/g, ' ') ?? '';
		if (text.length > SNIPPET_MAX) text = `${text.slice(0, SNIPPET_MAX - 1).trimEnd()}…`;
		return { index: s.index, label: text || '…', indent: s.trail.length, isSnippet: true };
	});
}
