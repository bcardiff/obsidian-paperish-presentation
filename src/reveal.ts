import type { Slide } from './partition';

export interface DeckPosition {
	slide: number;
	step: number; // fragment index; -1 = nothing revealed yet (ownHeading always visible)
}

function clampStep(slide: Slide | undefined, step: number): number {
	const max = (slide?.fragments.length ?? 0) - 1;
	return Math.max(-1, Math.min(step, max));
}

export function first(): DeckPosition {
	return { slide: 0, step: -1 };
}

export function last(slides: Slide[]): DeckPosition {
	const slide = Math.max(0, slides.length - 1);
	return { slide, step: clampStep(slides[slide], Infinity) };
}

export function next(slides: Slide[], pos: DeckPosition): DeckPosition {
	const s = slides[pos.slide];
	if (s && pos.step < s.fragments.length - 1) return { slide: pos.slide, step: pos.step + 1 };
	if (pos.slide < slides.length - 1) return { slide: pos.slide + 1, step: -1 };
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

export function applyPosition(slides: Slide[], pos: DeckPosition): void {
	for (const s of slides) {
		const off = s.index !== pos.slide;
		for (const el of s.elements) el.classList.toggle('pp-offslide', off);
		s.fragments.forEach((f, k) => f.classList.toggle('pp-revealed', !off && k <= pos.step));
	}
}
