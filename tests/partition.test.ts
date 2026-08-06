import { describe, it, expect } from 'vitest';
import { partition, PartitionOptions } from '../src/partition';

function containerFrom(html: string): HTMLElement {
	const div = document.createElement('div');
	div.innerHTML = html;
	return div;
}

const OPTS: PartitionOptions = { breakLevel: 2, hrBreaks: true, revealMode: 'blocks' };

describe('partition: slide boundaries', () => {
	it('splits at headings up to breakLevel; deeper headings do not split', () => {
		const c = containerFrom('<h1>A</h1><p>a</p><h2>B</h2><p>b</p><h3>C</h3><p>c</p>');
		const slides = partition(c, OPTS);
		expect(slides.length).toBe(3);
		expect(slides[0].elements.map((e) => e.tagName)).toEqual(['H1']);
		expect(slides[1].elements.map((e) => e.tagName)).toEqual(['P']);
		expect(slides[2].elements.map((e) => e.tagName)).toEqual(['H2', 'P', 'H3', 'P']);
	});

	it('H1 slides are title-only: following content opens a new slide with the h1 as trail', () => {
		const c = containerFrom('<h1>A</h1><p>a</p><p>b</p>');
		const slides = partition(c, OPTS);
		expect(slides.length).toBe(2);
		expect(slides[0].elements.map((e) => e.tagName)).toEqual(['H1']);
		expect(slides[0].ownHeading?.textContent).toBe('A');
		expect(slides[1].ownHeading).toBeNull();
		expect(slides[1].elements.map((e) => e.textContent)).toEqual(['a', 'b']);
		expect(slides[1].trail.map((h) => h.textContent)).toEqual(['A']);
	});

	it('H1 title-only rule applies at every break level', () => {
		const c = containerFrom('<h1>A</h1><p>a</p>');
		const slides = partition(c, { ...OPTS, breakLevel: 1 });
		expect(slides.length).toBe(2);
		expect(slides[0].elements.map((e) => e.tagName)).toEqual(['H1']);
		expect(slides[1].elements.map((e) => e.textContent)).toEqual(['a']);
	});

	it('emits no intro slide when the document opens with a break heading', () => {
		const c = containerFrom('<h1>A</h1><p>a</p>');
		const slides = partition(c, OPTS);
		expect(slides.length).toBe(2);
		expect(slides[0].ownHeading?.tagName).toBe('H1');
	});

	it('emits an intro slide when content precedes the first break', () => {
		const c = containerFrom('<p>intro</p><h1>A</h1><p>a</p>');
		const slides = partition(c, OPTS);
		expect(slides.length).toBe(3); // intro, title-only A, content
		expect(slides[0].ownHeading).toBeNull();
		expect(slides[0].elements.map((e) => e.textContent)).toEqual(['intro']);
	});

	it('splits at hr when hrBreaks is on; the hr belongs to no slide and is tagged', () => {
		const c = containerFrom('<h2>A</h2><p>a</p><hr><p>b</p>');
		const slides = partition(c, OPTS);
		expect(slides.length).toBe(2);
		expect(slides[1].ownHeading).toBeNull();
		expect(slides[1].elements.map((e) => e.textContent)).toEqual(['b']);
		const hr = c.querySelector('hr')!;
		expect(hr.hasAttribute('data-pp-hr')).toBe(true);
		expect(hr.hasAttribute('data-pp-slide')).toBe(false);
	});

	it('does not split at hr when hrBreaks is off (hr stays in the slide)', () => {
		const c = containerFrom('<h2>A</h2><p>a</p><hr><p>b</p>');
		const slides = partition(c, { ...OPTS, hrBreaks: false });
		expect(slides.length).toBe(1);
		expect(slides[0].elements.map((e) => e.tagName)).toEqual(['H2', 'P', 'HR', 'P']);
	});

	it('does not emit an empty slide for hr immediately followed by a heading', () => {
		const c = containerFrom('<h1>A</h1><hr><h1>B</h1>');
		const slides = partition(c, OPTS);
		expect(slides.length).toBe(2);
		expect(slides.every((s) => s.ownHeading !== null)).toBe(true);
	});

	it('keeps empty heading slides (section-title slides)', () => {
		const c = containerFrom('<h1>A</h1><h2>B</h2><p>b</p>');
		const slides = partition(c, OPTS);
		expect(slides.length).toBe(2);
		expect(slides[0].elements.map((e) => e.tagName)).toEqual(['H1']);
	});

	it('tags every slide element with data-pp-slide', () => {
		const c = containerFrom('<h1>A</h1><p>a</p><h1>B</h1><p>b</p>');
		partition(c, OPTS);
		// H1 title-only rule: [A], [a], [B], [b]
		expect(c.querySelector('p')?.getAttribute('data-pp-slide')).toBe('1');
		expect(c.querySelectorAll('[data-pp-slide="2"]').length).toBe(1);
		expect(c.querySelectorAll('[data-pp-slide="3"]').length).toBe(1);
	});
});

describe('partition: heading trail', () => {
	it('heading-opened slide trail = strict ancestors only', () => {
		const c = containerFrom('<h1>A</h1><h2>B</h2><p>b</p><h2>C</h2><p>c</p>');
		const slides = partition(c, OPTS);
		expect(slides[0].trail).toEqual([]);
		expect(slides[1].trail.map((h) => h.textContent)).toEqual(['A']);
		expect(slides[2].trail.map((h) => h.textContent)).toEqual(['A']);
	});

	it('trail pops siblings and deeper levels', () => {
		const c = containerFrom('<h1>A</h1><h2>B</h2><h1>X</h1><h2>Y</h2>');
		const slides = partition(c, OPTS);
		expect(slides[3].trail.map((h) => h.textContent)).toEqual(['X']);
	});

	it('hr-opened slide inherits the full trail in effect, including sub-break headings', () => {
		const c = containerFrom('<h1>A</h1><h2>B</h2><h3>C</h3><p>x</p><hr><p>y</p>');
		const slides = partition(c, OPTS);
		const hrSlide = slides[slides.length - 1];
		expect(hrSlide.ownHeading).toBeNull();
		expect(hrSlide.trail.map((h) => h.textContent)).toEqual(['A', 'B', 'C']);
	});
});

describe('partition: fragments', () => {
	it('blocks mode: every element except ownHeading is one fragment, tagged in order', () => {
		const c = containerFrom('<h2>T</h2><p>a</p><ul><li>1</li><li>2</li></ul><pre>code</pre>');
		const slides = partition(c, OPTS);
		expect(slides[0].fragments.map((e) => e.tagName)).toEqual(['P', 'UL', 'PRE']);
		expect(slides[0].fragments[1].getAttribute('data-pp-frag')).toBe('1');
	});

	it('list-items mode: top-level lists contribute direct li children; nested lists stay with their li', () => {
		const c = containerFrom('<h2>T</h2><ul><li>1<ul><li>1a</li></ul></li><li>2</li></ul>');
		const slides = partition(c, { ...OPTS, revealMode: 'list-items' });
		expect(slides[0].fragments.length).toBe(2);
		expect(slides[0].fragments.every((e) => e.tagName === 'LI')).toBe(true);
		expect(slides[0].fragments[0].querySelector('ul')).not.toBeNull(); // nested list stays with its parent li
		expect(c.querySelectorAll('[data-pp-frag]').length).toBe(2); // the nested li is NOT a fragment
	});

	it('none mode: no fragments and no data-pp-frag tags', () => {
		const c = containerFrom('<h2>T</h2><p>a</p>');
		const slides = partition(c, { ...OPTS, revealMode: 'none' });
		expect(slides[0].fragments).toEqual([]);
		expect(c.querySelectorAll('[data-pp-frag]').length).toBe(0);
	});

	it('re-partition with a different mode clears stale fragment tags', () => {
		const c = containerFrom('<h2>T</h2><ul><li>1</li><li>2</li></ul>');
		partition(c, { ...OPTS, revealMode: 'list-items' });
		expect(c.querySelectorAll('li[data-pp-frag]').length).toBe(2);
		partition(c, { ...OPTS, revealMode: 'blocks' });
		expect(c.querySelectorAll('li[data-pp-frag]').length).toBe(0);
		expect(c.querySelector('ul')?.getAttribute('data-pp-frag')).toBe('0');
	});
});
