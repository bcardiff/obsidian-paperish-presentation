import { describe, it, expect } from 'vitest';
import { partition, PartitionOptions, Slide } from '../src/partition';
import {
	first,
	last,
	next,
	prev,
	anchorOf,
	positionForAnchor,
	applyPosition,
	slideSignature,
	findSlideBySignature,
} from '../src/reveal';

function slidesFrom(html: string, opts?: Partial<PartitionOptions>): { c: HTMLElement; slides: Slide[] } {
	const c = document.createElement('div');
	c.innerHTML = html;
	return { c, slides: partition(c, { breakLevel: 2, hrBreaks: true, revealMode: 'blocks', ...opts }) };
}

const DECK = '<h2>A</h2><p>a1</p><p>a2</p><h2>B</h2><p>b1</p>';

describe('reveal: navigation math', () => {
	it('next steps through fragments, then advances slide at step -1', () => {
		const { slides } = slidesFrom(DECK);
		let pos = first(slides);
		expect(pos).toEqual({ slide: 0, step: -1 });
		pos = next(slides, pos);
		expect(pos).toEqual({ slide: 0, step: 0 });
		pos = next(slides, pos);
		expect(pos).toEqual({ slide: 0, step: 1 });
		pos = next(slides, pos);
		expect(pos).toEqual({ slide: 1, step: -1 });
	});

	it('next clamps at the very end', () => {
		const { slides } = slidesFrom(DECK);
		const end = last(slides);
		expect(end).toEqual({ slide: 1, step: 0 });
		expect(next(slides, end)).toEqual(end);
	});

	it('prev un-reveals steps, then enters the previous slide fully revealed', () => {
		const { slides } = slidesFrom(DECK);
		let pos = { slide: 1, step: -1 };
		pos = prev(slides, pos);
		expect(pos).toEqual({ slide: 0, step: 1 });
		pos = prev(slides, pos);
		expect(pos).toEqual({ slide: 0, step: 0 });
		pos = prev(slides, pos);
		expect(pos).toEqual({ slide: 0, step: -1 });
		expect(prev(slides, pos)).toEqual(pos); // clamps at start
	});

	it('with reveal mode none, next/prev move whole slides', () => {
		const { slides } = slidesFrom(DECK, { revealMode: 'none' });
		expect(next(slides, first(slides))).toEqual({ slide: 1, step: -1 });
		expect(prev(slides, { slide: 1, step: -1 })).toEqual({ slide: 0, step: -1 });
	});

	it('heading-less slides are entered with their first fragment revealed', () => {
		// H1 title slide, then the heading-less content slide it produces
		const { slides } = slidesFrom('<h1>T</h1><p>a</p><p>b</p>');
		expect(slides[1].ownHeading).toBeNull();
		expect(next(slides, { slide: 0, step: -1 })).toEqual({ slide: 1, step: 0 });
	});

	it('first() starts a heading-less intro slide at step 0', () => {
		const { slides } = slidesFrom('<p>intro</p><h2>A</h2><p>a</p>');
		expect(first(slides)).toEqual({ slide: 0, step: 0 });
	});

	it('first() keeps step -1 for heading slides, empty decks, and none mode', () => {
		expect(first(slidesFrom(DECK).slides)).toEqual({ slide: 0, step: -1 });
		expect(first([])).toEqual({ slide: 0, step: -1 });
		const none = slidesFrom('<p>intro</p><h2>A</h2>', { revealMode: 'none' }).slides;
		expect(first(none)).toEqual({ slide: 0, step: -1 });
	});
});

describe('reveal: identity-anchored position (§2)', () => {
	it('finds the same slide again after content shifts indices', () => {
		const { c, slides } = slidesFrom(DECK);
		const pos = { slide: 1, step: -1 };
		const anchor = anchorOf(slides, pos);
		expect(anchor?.textContent).toBe('B');
		// async content settles: a new h2 appears before B
		const h2 = document.createElement('h2');
		h2.textContent = 'NEW';
		c.insertBefore(h2, c.children[3]);
		const slides2 = partition(c, { breakLevel: 2, hrBreaks: true, revealMode: 'blocks' });
		const restored = positionForAnchor(slides2, anchor, pos);
		expect(restored.slide).toBe(2);
		expect(slides2[restored.slide].ownHeading?.textContent).toBe('B');
	});

	it('clamps step and slide when the anchor is gone', () => {
		const { slides } = slidesFrom('<h2>A</h2><p>a1</p>');
		const gone = document.createElement('p');
		expect(positionForAnchor(slides, gone, { slide: 9, step: 9 })).toEqual({ slide: 0, step: 0 });
		expect(positionForAnchor([], null, { slide: 9, step: 9 })).toEqual({ slide: 0, step: -1 });
	});
});

describe('reveal: cross-render signatures (§10.8 refresh)', () => {
	const DOC = '<h1>T</h1><p>intro</p><h2>A</h2><p>a</p><h2>B</h2><p>b</p>';
	// slides: [T], [intro], [A, a], [B, b]

	it('round-trips a heading slide across an identical re-render', () => {
		const { slides } = slidesFrom(DOC);
		const sig = slideSignature(slides, 3);
		const { slides: slides2 } = slidesFrom(DOC); // fresh nodes, same structure
		expect(findSlideBySignature(slides2, sig)).toBe(3);
	});

	it('follows the heading when slides shift around it', () => {
		const { slides } = slidesFrom(DOC);
		const sig = slideSignature(slides, 3); // slide "B"
		const { slides: slides2 } = slidesFrom('<h1>T</h1><p>intro</p><h2>NEW</h2><p>n</p><h2>A</h2><p>a</p><h2>B</h2><p>b</p>');
		expect(slides2[findSlideBySignature(slides2, sig)]?.ownHeading?.textContent).toBe('B');
	});

	it('matches by occurrence when heading text repeats', () => {
		const dup = '<h2>X</h2><p>1</p><h2>X</h2><p>2</p>';
		const { slides } = slidesFrom(dup);
		const sig = slideSignature(slides, 1); // second "X"
		const { slides: slides2 } = slidesFrom(dup);
		expect(findSlideBySignature(slides2, sig)).toBe(1);
	});

	it('restores heading-less slides via nearest preceding heading + offset', () => {
		const { slides } = slidesFrom(DOC);
		const sig = slideSignature(slides, 1); // intro slide after the H1
		const { slides: slides2 } = slidesFrom(DOC);
		expect(findSlideBySignature(slides2, sig)).toBe(1);
	});

	it('falls back to a clamped index when the heading is gone', () => {
		const { slides } = slidesFrom(DOC);
		const sig = slideSignature(slides, 3);
		const { slides: slides2 } = slidesFrom('<h2>Other</h2><p>o</p><h2>More</h2><p>m</p>');
		expect(findSlideBySignature(slides2, sig)).toBe(1); // clamp of fallbackIndex 3 to last slide
		expect(findSlideBySignature([], sig)).toBe(0);
	});
});

describe('reveal: applyPosition', () => {
	it('hides other slides with .pp-offslide and reveals fragments up to step', () => {
		const { c, slides } = slidesFrom(DECK);
		applyPosition(slides, { slide: 0, step: 0 });
		expect(c.querySelectorAll('.pp-offslide').length).toBe(2); // h2 B + p b1
		expect(slides[0].fragments[0].classList.contains('pp-revealed')).toBe(true);
		expect(slides[0].fragments[1].classList.contains('pp-revealed')).toBe(false);
		applyPosition(slides, { slide: 1, step: -1 });
		expect(slides[0].elements.every((e) => e.classList.contains('pp-offslide'))).toBe(true);
		expect(slides[1].elements.every((e) => !e.classList.contains('pp-offslide'))).toBe(true);
	});

	it('reveal state is deck-global: past slides fully revealed, future slides not', () => {
		const { slides } = slidesFrom(DECK);
		applyPosition(slides, { slide: 0, step: 0 });
		// Future slide's fragments stay unrevealed (hidden style keeps them invisible off-slide).
		expect(slides[1].fragments.every((f) => !f.classList.contains('pp-revealed'))).toBe(true);
		applyPosition(slides, { slide: 1, step: -1 });
		// Past slide's fragments stay revealed — going forward must not blank out prior content.
		expect(slides[0].fragments.every((f) => f.classList.contains('pp-revealed'))).toBe(true);
		expect(slides[1].fragments.every((f) => !f.classList.contains('pp-revealed'))).toBe(true);
	});

	it('keeps .pp-sticky-heading on exactly the current slide own heading', () => {
		const { slides } = slidesFrom(DECK);
		applyPosition(slides, { slide: 0, step: 0 });
		expect(slides[0].ownHeading?.classList.contains('pp-sticky-heading')).toBe(true);
		expect(slides[1].ownHeading?.classList.contains('pp-sticky-heading')).toBe(false);
		applyPosition(slides, { slide: 1, step: -1 });
		expect(slides[0].ownHeading?.classList.contains('pp-sticky-heading')).toBe(false);
		expect(slides[1].ownHeading?.classList.contains('pp-sticky-heading')).toBe(true);
	});

	it('clears the stuck styling hook when a heading stops being current', () => {
		const { slides } = slidesFrom(DECK);
		applyPosition(slides, { slide: 0, step: 0 });
		slides[0].ownHeading?.classList.add('pp-stuck'); // as the view would while pinned
		applyPosition(slides, { slide: 1, step: -1 });
		expect(slides[0].ownHeading?.classList.contains('pp-stuck')).toBe(false);
	});

	it('sticky marking copes with heading-less slides', () => {
		const { c, slides } = slidesFrom('<h2>A</h2><p>a1</p><hr><p>b1</p>');
		applyPosition(slides, { slide: 1, step: 0 });
		expect(slides[1].ownHeading).toBeNull();
		expect(c.querySelectorAll('.pp-sticky-heading').length).toBe(0);
	});

	it('marks elements of slides after the current one with .pp-upcoming', () => {
		const { slides } = slidesFrom(DECK);
		applyPosition(slides, { slide: 0, step: 0 });
		// Future slide is fully upcoming — its heading too, so 'hidden' can hide it all.
		expect(slides[1].elements.every((e) => e.classList.contains('pp-upcoming'))).toBe(true);
		expect(slides[0].elements.every((e) => !e.classList.contains('pp-upcoming'))).toBe(true);
		applyPosition(slides, { slide: 1, step: -1 });
		expect(slides[1].elements.every((e) => !e.classList.contains('pp-upcoming'))).toBe(true);
		expect(slides[0].elements.every((e) => !e.classList.contains('pp-upcoming'))).toBe(true);
	});
});
