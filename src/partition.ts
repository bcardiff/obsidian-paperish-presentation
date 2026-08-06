export interface PartitionOptions {
	breakLevel: 1 | 2 | 3;
	hrBreaks: boolean;
	revealMode: 'none' | 'blocks' | 'list-items';
}

export interface Slide {
	index: number;
	elements: HTMLElement[]; // top-level children of this slide (live refs)
	trail: HTMLElement[]; // headings in effect at slide start, level ascending (§4)
	ownHeading: HTMLElement | null;
	fragments: HTMLElement[]; // revealable elements in step order (§5)
}

const HEADING_LEVELS: Record<string, number> = { H1: 1, H2: 2, H3: 3, H4: 4, H5: 5, H6: 6 };

function headingLevel(el: HTMLElement): number | undefined {
	return HEADING_LEVELS[el.tagName];
}

function popTrailTo(trail: HTMLElement[], level: number): void {
	while (trail.length > 0) {
		const last = trail[trail.length - 1]!;
		const lastLevel = headingLevel(last);
		if (lastLevel === undefined || lastLevel >= level) {
			trail.pop();
		} else {
			break;
		}
	}
}

function computeFragments(slide: Slide, mode: PartitionOptions['revealMode']): HTMLElement[] {
	if (mode === 'none') return [];
	const fragments: HTMLElement[] = [];
	for (const el of slide.elements) {
		if (el === slide.ownHeading || el.tagName === 'HR') continue;
		if (mode === 'list-items' && (el.tagName === 'UL' || el.tagName === 'OL')) {
			for (const li of Array.from(el.children)) {
				if (li instanceof HTMLElement && li.tagName === 'LI') fragments.push(li);
			}
		} else {
			fragments.push(el);
		}
	}
	return fragments;
}

export function partition(container: HTMLElement, options: PartitionOptions): Slide[] {
	// Clear tags from a previous partition; a re-partition must start clean.
	for (const el of Array.from(container.querySelectorAll('[data-pp-slide], [data-pp-frag]'))) {
		el.removeAttribute('data-pp-slide');
		el.removeAttribute('data-pp-frag');
	}

	const slides: Slide[] = [];
	const trail: HTMLElement[] = [];
	let current: Slide | null = null;

	const openSlide = (ownHeading: HTMLElement | null): Slide => {
		const slide: Slide = {
			index: slides.length,
			elements: [],
			trail: [...trail],
			ownHeading,
			fragments: [],
		};
		slides.push(slide);
		return slide;
	};

	for (const child of Array.from(container.children)) {
		// Native `instanceof` (not .instanceOf()): this module is unit-tested under jsdom,
		// which lacks Obsidian's runtime .instanceOf() polyfill — see the eslint.config.mts
		// override for src/partition.ts.
		if (!(child instanceof HTMLElement)) continue;

		if (child.tagName === 'HR' && options.hrBreaks) {
			child.setAttribute('data-pp-hr', '');
			current = null; // next content lazily opens an hr slide — never an empty one
			continue;
		}

		const level = headingLevel(child);
		if (level !== undefined && level <= options.breakLevel) {
			popTrailTo(trail, level);
			current = openSlide(child); // trail holds exactly the ancestors here
			trail.push(child);
		} else {
			if (current === null) current = openSlide(null); // trail = headings in effect
			if (level !== undefined) {
				popTrailTo(trail, level);
				trail.push(child);
			}
		}
		current.elements.push(child);
		// H1 slides are title-only: following content lazily opens a new slide,
		// like the post-HR rule (§4).
		if (level === 1 && child === current.ownHeading) current = null;
	}

	for (const slide of slides) {
		for (const el of slide.elements) el.setAttribute('data-pp-slide', String(slide.index));
		slide.fragments = computeFragments(slide, options.revealMode);
		slide.fragments.forEach((f, k) => f.setAttribute('data-pp-frag', String(k)));
	}
	return slides;
}
