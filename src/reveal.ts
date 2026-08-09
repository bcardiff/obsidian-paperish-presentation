import type { Slide } from './partition';

export interface DeckPosition {
	slide: number;
	step: number; // fragment index; -1 = nothing revealed yet (ownHeading always visible)
}

function clampStep(slide: Slide | undefined, step: number): number {
	const max = (slide?.fragments.length ?? 0) - 1;
	return Math.max(-1, Math.min(step, max));
}

/**
 * Step to use when entering a slide going forward. Heading-less slides
 * (content after an H1 title slide, hr slides, intro slides) enter with their
 * first fragment revealed — at step -1 nothing on them would be visible (§5).
 */
export function entryStep(slide: Slide | undefined): number {
	if (!slide || slide.ownHeading !== null || slide.fragments.length === 0) return -1;
	return 0;
}

export function first(slides: Slide[]): DeckPosition {
	return { slide: 0, step: entryStep(slides[0]) };
}

export function last(slides: Slide[]): DeckPosition {
	const slide = Math.max(0, slides.length - 1);
	return { slide, step: clampStep(slides[slide], Infinity) };
}

export function next(slides: Slide[], pos: DeckPosition): DeckPosition {
	const s = slides[pos.slide];
	if (s && pos.step < s.fragments.length - 1) return { slide: pos.slide, step: pos.step + 1 };
	if (pos.slide < slides.length - 1) return { slide: pos.slide + 1, step: entryStep(slides[pos.slide + 1]) };
	return pos;
}

export function prev(slides: Slide[], pos: DeckPosition): DeckPosition {
	if (pos.step > -1) return { slide: pos.slide, step: pos.step - 1 };
	if (pos.slide > 0) return { slide: pos.slide - 1, step: clampStep(slides[pos.slide - 1], Infinity) };
	return pos;
}

export function anchorOf(slides: Slide[], pos: DeckPosition): HTMLElement | null {
	const s = slides[pos.slide];
	return s ? (s.ownHeading ?? s.elements[0] ?? null) : null;
}

export function positionForAnchor(
	slides: Slide[],
	anchor: HTMLElement | null,
	fallback: DeckPosition,
): DeckPosition {
	if (slides.length === 0) return { slide: 0, step: -1 };
	if (anchor) {
		const idx = slides.findIndex((s) => s.ownHeading === anchor || s.elements.includes(anchor));
		if (idx >= 0) return { slide: idx, step: clampStep(slides[idx], fallback.step) };
	}
	const slide = Math.max(0, Math.min(fallback.slide, slides.length - 1));
	return { slide, step: clampStep(slides[slide], fallback.step) };
}

/**
 * Cross-render position mapping (§10.8): a re-render produces all-new DOM
 * nodes, so identity anchoring (positionForAnchor) cannot survive a refresh.
 * A signature describes a slide by its nearest preceding ownHeading
 * (text + level + occurrence) plus a slide offset, with an index fallback.
 */
export interface SlideSignature {
	headingText: string | null;
	headingLevel: number;
	occurrence: number; // among heading slides with the same text + level
	offset: number; // slides between the heading slide and the target slide
	fallbackIndex: number;
}

function headingKey(h: HTMLElement): string {
	return h.getAttribute('data-heading') ?? h.textContent?.trim() ?? '';
}

function headingLevelOf(h: HTMLElement): number {
	return Number(h.tagName.slice(1)) || 0;
}

export function slideSignature(slides: Slide[], index: number): SlideSignature {
	let hIdx = Math.min(index, slides.length - 1);
	while (hIdx >= 0 && !slides[hIdx]?.ownHeading) hIdx--;
	const h = hIdx >= 0 ? slides[hIdx]!.ownHeading! : null;
	if (!h) return { headingText: null, headingLevel: 0, occurrence: 0, offset: index, fallbackIndex: index };
	const text = headingKey(h);
	const level = headingLevelOf(h);
	let occurrence = 0;
	for (let i = 0; i < hIdx; i++) {
		const oh = slides[i]?.ownHeading;
		if (oh && headingKey(oh) === text && headingLevelOf(oh) === level) occurrence++;
	}
	return { headingText: text, headingLevel: level, occurrence, offset: index - hIdx, fallbackIndex: index };
}

export function findSlideBySignature(slides: Slide[], sig: SlideSignature): number {
	if (slides.length === 0) return 0;
	const clamp = (i: number) => Math.max(0, Math.min(i, slides.length - 1));
	if (sig.headingText !== null) {
		let seen = 0;
		for (let i = 0; i < slides.length; i++) {
			const oh = slides[i]?.ownHeading;
			if (oh && headingKey(oh) === sig.headingText && headingLevelOf(oh) === sig.headingLevel) {
				if (seen === sig.occurrence) return clamp(i + sig.offset);
				seen++;
			}
		}
	}
	return clamp(sig.fallbackIndex);
}

export function applyPosition(slides: Slide[], pos: DeckPosition): void {
	for (const s of slides) {
		const off = s.index !== pos.slide;
		for (const el of s.elements) {
			el.classList.toggle('pp-offslide', off);
			// Direction-aware marker: 'hidden' un-revealed style hides upcoming
			// slides wholesale — including their headings, which are not fragments.
			el.classList.toggle('pp-upcoming', s.index > pos.slide);
		}
		// Reveal state is deck-global, not slide-local: past slides stay fully
		// revealed and future slides stay unrevealed, so the 'hidden' unrevealed
		// style can keep upcoming fragments invisible while they are off-slide (§5).
		const revealedTo = s.index < pos.slide ? Infinity : s.index > pos.slide ? -1 : pos.step;
		s.fragments.forEach((f, k) => f.classList.toggle('pp-revealed', k <= revealedTo));
	}
}
