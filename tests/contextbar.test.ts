import { describe, it, expect } from 'vitest';
import { trailsEqual, buildTrailContent } from '../src/contextbar';

function heading(html: string): HTMLElement {
	const h = document.createElement('h2');
	h.innerHTML = html;
	return h;
}

describe('trailsEqual', () => {
	it('compares by element identity and length', () => {
		const a = heading('A');
		const b = heading('B');
		expect(trailsEqual([a, b], [a, b])).toBe(true);
		expect(trailsEqual([a], [a, b])).toBe(false);
		expect(trailsEqual([a], [heading('A')])).toBe(false); // same text, different element
	});
});

describe('buildTrailContent', () => {
	it('clones heading contents into items with separators between them', () => {
		const frag = buildTrailContent([heading('One'), heading('Two')]);
		const host = document.createElement('div');
		host.appendChild(frag);
		expect(host.querySelectorAll('.pp-trail-item').length).toBe(2);
		expect(host.querySelectorAll('.pp-trail-sep').length).toBe(1);
		expect(host.textContent).toBe('One›Two');
	});

	it('preserves inline formatting but strips interactive cruft (§6)', () => {
		const h = heading(
			'<span class="heading-collapse-indicator">▸</span><em>Fancy</em> <a class="internal-link">link</a><button>x</button>',
		);
		const host = document.createElement('div');
		host.appendChild(buildTrailContent([h]));
		expect(host.querySelector('em')).not.toBeNull(); // formatting kept
		expect(host.querySelector('.heading-collapse-indicator')).toBeNull();
		expect(host.querySelector('button')).toBeNull();
		// the original heading is untouched
		expect(h.querySelector('button')).not.toBeNull();
	});

	it('produces no heading tags in the bar (content is unwrapped into spans)', () => {
		const host = document.createElement('div');
		host.appendChild(buildTrailContent([heading('One')]));
		expect(host.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
	});
});
