import type { SlideSignature } from './reveal';

export interface SourceHeading {
	heading: string;
	level: number;
	line: number;
}

export interface SourceSection {
	type: string;
	line: number;
}

export interface SourceMapOptions {
	breakLevel: 1 | 2 | 3;
	hrBreaks: boolean;
}

function findAnchor(headings: SourceHeading[], sig: SlideSignature): SourceHeading | null {
	let seen = 0;
	for (const h of headings) {
		if (h.heading === sig.headingText && h.level === sig.headingLevel) {
			if (seen === sig.occurrence) return h;
			seen++;
		}
	}
	return null;
}

/**
 * Source line of the slide a signature describes, for scrolling the editor in
 * step with the deck (§7b). The signature anchors on a heading; its offset
 * counts slides opened after that heading — by `---` rules, or by the
 * H1-title-only rule — so the walk below replays partition's break rules (§4)
 * over the source sections rather than counting `---` lines, which would
 * miscount an `---` that opens no slide.
 *
 * Returns null when nothing can be matched; the caller then leaves the editor
 * alone rather than scrolling to a guess.
 */
export function sourceLineForSlide(
	sections: SourceSection[],
	headings: SourceHeading[],
	sig: SlideSignature,
	options: SourceMapOptions,
): number | null {
	if (sig.headingText === null) return null;
	const anchor = findAnchor(headings, sig);
	if (anchor === null) return null;
	if (sig.offset <= 0) return anchor.line;

	const levelAt = new Map(headings.map((h) => [h.line, h.level]));
	const start = sections.findIndex((s) => s.line === anchor.line && s.type === 'heading');
	if (start < 0) return anchor.line;

	// The anchor's own slide is open, unless it is an H1 — those are title-only,
	// so following content lazily opens the next slide (§4).
	let open = anchor.level !== 1;
	let slidesSeen = 0;
	let lastLine = anchor.line;

	for (const section of sections.slice(start + 1)) {
		const level = section.type === 'heading' ? levelAt.get(section.line) : undefined;
		if (level !== undefined && level <= options.breakLevel) break; // next heading slide: out of this region
		if (section.type === 'thematicBreak' && options.hrBreaks) {
			open = false; // lazily: the next content opens the slide, an hr alone never does
			continue;
		}
		if (!open) {
			slidesSeen++;
			lastLine = section.line;
			if (slidesSeen === sig.offset) return section.line;
			open = true;
		}
	}
	return lastLine; // offset ran past the region: clamp to its last slide
}
