import { describe, it, expect } from 'vitest';

describe('test environment', () => {
	it('provides a DOM', () => {
		const el = document.createElement('div');
		el.innerHTML = '<h1>hi</h1>';
		expect(el.querySelector('h1')?.textContent).toBe('hi');
	});
});
