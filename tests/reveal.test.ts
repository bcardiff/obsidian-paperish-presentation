import { describe, it, expect } from 'vitest';
import { partition, PartitionOptions, Slide } from '../src/partition';
import { first, last, next, prev, anchorOf, positionForAnchor, applyPosition } from '../src/reveal';

function slidesFrom(html: string, opts?: Partial<PartitionOptions>): { c: HTMLElement; slides: Slide[] } {
	const c = document.createElement('div');
	c.innerHTML = html;
	return { c, slides: partition(c, { breakLevel: 2, hrBreaks: true, revealMode: 'blocks', ...opts }) };
}

const DECK = '<h2>A</h2><p>a1</p><p>a2</p><h2>B</h2><p>b1</p>';

describe('reveal: navigation math', () => {
	it('next steps through fragments, then advances slide at step -1', () => {
		const { slides } = slidesFrom(DECK);
		let pos = first();
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
		expect(next(slides, first())).toEqual({ slide: 1, step: -1 });
		expect(prev(slides, { slide: 1, step: -1 })).toEqual({ slide: 0, step: -1 });
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
});
