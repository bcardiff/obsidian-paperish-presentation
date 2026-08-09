// Interactive/preview cruft to remove from heading clones (§6). Will grow.
const STRIP_SELECTORS = [
	'.heading-collapse-indicator',
	'.collapse-indicator',
	'.heading-anchor',
	'.edit-block-button',
	'button',
].join(', ');

export function trailsEqual(a: HTMLElement[], b: HTMLElement[]): boolean {
	return a.length === b.length && a.every((h, i) => h === b[i]);
}

export function buildTrailContent(trail: HTMLElement[]): DocumentFragment {
	const frag = createFragment();
	trail.forEach((h, i) => {
		if (i > 0) frag.createSpan({ cls: 'pp-trail-sep', text: '›' });
		const clone = h.cloneNode(true) as HTMLElement;
		clone.querySelectorAll(STRIP_SELECTORS).forEach((n) => n.remove());
		const item = frag.createSpan({ cls: 'pp-trail-item' });
		item.append(...Array.from(clone.childNodes));
	});
	return frag;
}
