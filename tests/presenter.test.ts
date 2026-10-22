import { describe, it, expect } from 'vitest';
import { stripPresenterNotes } from '../src/presenter';

function containerFrom(html: string): HTMLElement {
	const div = document.createElement('div');
	div.innerHTML = html;
	return div;
}

// Shape of a rendered Obsidian callout, trimmed to what the strip needs.
function callout(type: string, body = 'note'): string {
	return `<div class="callout" data-callout="${type}"><div class="callout-title">${type}</div><div class="callout-content"><p>${body}</p></div></div>`;
}

describe('stripPresenterNotes', () => {
	it('removes a top-level presenter callout', () => {
		const c = containerFrom(`<h2>A</h2>${callout('presenter')}<p>a</p>`);
		stripPresenterNotes(c);
		expect(Array.from(c.children).map((e) => e.tagName)).toEqual(['H2', 'P']);
	});

	it('leaves other callout types alone', () => {
		const c = containerFrom(`${callout('note')}${callout('warning')}`);
		stripPresenterNotes(c);
		expect(Array.from(c.querySelectorAll('[data-callout]')).map((e) => e.getAttribute('data-callout'))).toEqual([
			'note',
			'warning',
		]);
	});

	it('removes every presenter callout, not just the first', () => {
		const c = containerFrom(`${callout('presenter', 'one')}<p>a</p>${callout('presenter', 'two')}`);
		stripPresenterNotes(c);
		expect(c.querySelectorAll('[data-callout="presenter"]').length).toBe(0);
		expect(c.children.length).toBe(1);
	});

	it('removes a presenter callout nested inside a list item', () => {
		const c = containerFrom(`<ul><li>a${callout('presenter')}</li><li>b</li></ul>`);
		stripPresenterNotes(c);
		expect(c.querySelectorAll('[data-callout="presenter"]').length).toBe(0);
		expect(c.querySelectorAll('li').length).toBe(2);
	});

	it('removes a presenter callout nested inside another callout', () => {
		const c = containerFrom(
			`<div class="callout" data-callout="note"><div class="callout-content">${callout('presenter')}</div></div>`,
		);
		stripPresenterNotes(c);
		expect(c.querySelectorAll('[data-callout="presenter"]').length).toBe(0);
		expect(c.querySelectorAll('[data-callout="note"]').length).toBe(1);
	});

	it('matches the callout type case-insensitively, as Obsidian renders it', () => {
		const c = containerFrom(callout('Presenter'));
		stripPresenterNotes(c);
		expect(c.children.length).toBe(0);
	});

	it('leaves a container without presenter callouts untouched', () => {
		const c = containerFrom('<h2>A</h2><p>a</p>');
		stripPresenterNotes(c);
		expect(Array.from(c.children).map((e) => e.tagName)).toEqual(['H2', 'P']);
	});
});
