// Minimal jsdom polyfills for the Obsidian DOM helpers the modules under test rely on
// (declared globally by obsidian.d.ts, provided at runtime by the Obsidian app):
// Node#instanceOf, Node#createSpan, and the createFragment global. Only the behavior
// the src modules actually use is implemented.

// Type-only import: erased at runtime (the 'obsidian' package has no runtime module),
// but it brings the `declare global` augmentations into scope for this file.
import type {} from 'obsidian';

Node.prototype.instanceOf = function (this: Node, type: new () => unknown): boolean {
	return this instanceof type;
} as Node['instanceOf'];

Node.prototype.createSpan = function (this: Node, o?: DomElementInfo | string): HTMLSpanElement {
	const el = document.createElement('span');
	if (typeof o === 'string') {
		el.className = o;
	} else if (o) {
		if (o.cls) el.className = Array.isArray(o.cls) ? o.cls.join(' ') : o.cls;
		if (typeof o.text === 'string') el.textContent = o.text;
		else if (o.text) el.append(o.text);
	}
	this.appendChild(el);
	return el;
};

(globalThis as { createFragment?: typeof createFragment }).createFragment = (
	callback?: (el: DocumentFragment) => void,
): DocumentFragment => {
	const frag = document.createDocumentFragment();
	callback?.(frag);
	return frag;
};
