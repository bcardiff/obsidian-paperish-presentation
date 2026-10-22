import { describe, it, expect } from 'vitest';
import { SourceHeading, SourceSection, SourceMapOptions, sourceLineForSlide } from '../src/sync';
import type { SlideSignature } from '../src/reveal';

const OPTS: SourceMapOptions = { breakLevel: 2, hrBreaks: true };

/**
 * Build the section/heading lists metadataCache would produce, from a terse
 * line spec: '# T' / '## A' / '---' / anything else is a paragraph. Index in
 * the array is the line number.
 */
function source(lines: string[]): { sections: SourceSection[]; headings: SourceHeading[] } {
	const sections: SourceSection[] = [];
	const headings: SourceHeading[] = [];
	lines.forEach((text, line) => {
		const h = /^(#{1,6})\s+(.*)$/.exec(text);
		if (h) {
			sections.push({ type: 'heading', line });
			headings.push({ heading: h[2], level: h[1].length, line });
		} else if (text === '---') {
			sections.push({ type: 'thematicBreak', line });
		} else {
			sections.push({ type: 'paragraph', line });
		}
	});
	return { sections, headings };
}

function sig(partial: Partial<SlideSignature>): SlideSignature {
	return { headingText: null, headingLevel: 0, occurrence: 0, offset: 0, fallbackIndex: 0, ...partial };
}

describe('sourceLineForSlide: anchoring on the heading', () => {
	it('returns the heading line at offset 0', () => {
		const { sections, headings } = source(['# T', 'a', '## A', 'b']);
		const line = sourceLineForSlide(sections, headings, sig({ headingText: 'A', headingLevel: 2 }), OPTS);
		expect(line).toBe(2);
	});

	it('picks the right one among headings sharing text and level, by occurrence', () => {
		const { sections, headings } = source(['## Demo', 'a', '## Demo', 'b', '## Demo', 'c']);
		const at = (occurrence: number) =>
			sourceLineForSlide(sections, headings, sig({ headingText: 'Demo', headingLevel: 2, occurrence }), OPTS);
		expect([at(0), at(1), at(2)]).toEqual([0, 2, 4]);
	});

	it('distinguishes headings with the same text at different levels', () => {
		const { sections, headings } = source(['# Demo', 'a', '## Demo', 'b']);
		const line = sourceLineForSlide(sections, headings, sig({ headingText: 'Demo', headingLevel: 2 }), OPTS);
		expect(line).toBe(2);
	});

	it('returns null when the heading is not in the source', () => {
		const { sections, headings } = source(['## A', 'a']);
		expect(sourceLineForSlide(sections, headings, sig({ headingText: 'Gone', headingLevel: 2 }), OPTS)).toBeNull();
	});

	it('returns null for a slide with no heading before it', () => {
		const { sections, headings } = source(['a', '## A']);
		expect(sourceLineForSlide(sections, headings, sig({ offset: 0 }), OPTS)).toBeNull();
	});
});

describe('sourceLineForSlide: counting slides past the heading', () => {
	it('follows one --- to the content after it', () => {
		const { sections, headings } = source(['## A', 'a', '---', 'b']);
		const line = sourceLineForSlide(sections, headings, sig({ headingText: 'A', headingLevel: 2, offset: 1 }), OPTS);
		expect(line).toBe(3);
	});

	it('counts several --- under one heading', () => {
		const { sections, headings } = source(['## A', 'a', '---', 'b', '---', 'c']);
		const at = (offset: number) =>
			sourceLineForSlide(sections, headings, sig({ headingText: 'A', headingLevel: 2, offset }), OPTS);
		expect([at(0), at(1), at(2)]).toEqual([0, 3, 5]);
	});

	it('does not count a --- that is immediately followed by a heading (no slide opens)', () => {
		const { sections, headings } = source(['## A', 'a', '---', '## B', 'b']);
		const line = sourceLineForSlide(sections, headings, sig({ headingText: 'A', headingLevel: 2, offset: 1 }), OPTS);
		expect(line).toBe(0); // clamps back to A — no slide exists at that offset
	});

	it('treats content after an H1 as the next slide, with no --- involved', () => {
		const { sections, headings } = source(['# T', 'a', 'b']);
		const line = sourceLineForSlide(sections, headings, sig({ headingText: 'T', headingLevel: 1, offset: 1 }), OPTS);
		expect(line).toBe(1);
	});

	it('opens no slide at a --- when hr breaks are off', () => {
		const { sections, headings } = source(['## A', 'a', '---', 'b']);
		const line = sourceLineForSlide(sections, headings, sig({ headingText: 'A', headingLevel: 2, offset: 1 }), {
			breakLevel: 2,
			hrBreaks: false,
		});
		expect(line).toBe(0);
	});

	it('keeps walking past headings deeper than the break level', () => {
		const { sections, headings } = source(['## A', 'a', '---', '### B', 'b']);
		const line = sourceLineForSlide(sections, headings, sig({ headingText: 'A', headingLevel: 2, offset: 1 }), OPTS);
		expect(line).toBe(3); // the H3 opens the post-hr slide; it is ordinary content
	});

	it('stops at the next break-level heading and clamps to the last slide found', () => {
		const { sections, headings } = source(['## A', 'a', '---', 'b', '## B', 'c', '---', 'd']);
		const line = sourceLineForSlide(sections, headings, sig({ headingText: 'A', headingLevel: 2, offset: 5 }), OPTS);
		expect(line).toBe(3); // A's last slide, never B's
	});

	it('respects a shallower break level: an H2 no longer ends the region', () => {
		const { sections, headings } = source(['# T', 'a', '## A', 'b']);
		const line = sourceLineForSlide(sections, headings, sig({ headingText: 'T', headingLevel: 1, offset: 1 }), {
			breakLevel: 1,
			hrBreaks: true,
		});
		expect(line).toBe(1); // content after the H1 title slide, H2 included in it
	});
});
