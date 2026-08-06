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
	const frag = document.createDocumentFragment();
	trail.forEach((h, i) => {
		if (i > 0) {
			const sep = document.createElement('span');
			sep.className = 'pp-trail-sep';
			sep.textContent = '›';
			frag.appendChild(sep);
		}
		const clone = h.cloneNode(true) as HTMLElement;
		clone.querySelectorAll(STRIP_SELECTORS).forEach((n) => n.remove());
		const item = document.createElement('span');
		item.className = 'pp-trail-item';
		item.append(...Array.from(clone.childNodes));
		frag.appendChild(item);
	});
	return frag;
}
