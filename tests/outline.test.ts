import { describe, it, expect } from 'vitest';
import { partition, PartitionOptions } from '../src/partition';
import { outlineItems } from '../src/outline';

function itemsFrom(html: string, opts?: Partial<PartitionOptions>) {
	const c = document.createElement('div');
	c.innerHTML = html;
	return outlineItems(partition(c, { breakLevel: 2, hrBreaks: true, revealMode: 'blocks', ...opts }));
}

describe('outline items', () => {
	it('one row per slide with heading labels and trail-based indent', () => {
		const items = itemsFrom('<h1 data-heading="Top">Top</h1><h2>Sub</h2><p>x</p><h2>Other</h2>');
		expect(items.map((i) => [i.label, i.indent, i.isSnippet])).toEqual([
			['Top', 0, false],
			['Sub', 1, false],
			['Other', 1, false],
		]);
		expect(items.map((i) => i.index)).toEqual([0, 1, 2]);
	});

	it('prefers data-heading over rendered text', () => {
		const items = itemsFrom('<h2 data-heading="Raw *md*"><em>Raw md</em></h2><p>x</p>');
		expect(items[0].label).toBe('Raw *md*');
	});

	it('heading-less slides show a truncated snippet, nested under their section', () => {
		const long = 'A very long paragraph that keeps going well past the limit for labels';
		const items = itemsFrom(`<h1>T</h1><p>${long}</p>`);
		expect(items[1].isSnippet).toBe(true);
		expect(items[1].indent).toBe(1);
		expect(items[1].label.length).toBeLessThanOrEqual(40);
		expect(items[1].label.endsWith('…')).toBe(true);
	});

	it('cover slides use the cover title at indent 0', () => {
		const items = itemsFrom(
			'<div data-pp-cover><div class="pp-cover-title">Deck</div><div class="pp-cover-desc">d</div></div><h2>A</h2><p>a</p>',
		);
		expect(items[0]).toMatchObject({ label: 'Deck', indent: 0, isSnippet: false });
	});
});
