/** Callout type whose notes are for the presenter's eyes only. */
const PRESENTER_CALLOUT = 'presenter';

/**
 * Remove `> [!presenter]` callouts from the rendered DOM, anywhere they appear.
 * Hiding them in CSS is not enough: they would still occupy a fragment slot and
 * take a step in the reveal sequence (§5). The note itself is never touched.
 */
export function stripPresenterNotes(container: HTMLElement): void {
	for (const el of Array.from(container.querySelectorAll('[data-callout]'))) {
		if (el.getAttribute('data-callout')?.toLowerCase() === PRESENTER_CALLOUT) el.remove();
	}
}
