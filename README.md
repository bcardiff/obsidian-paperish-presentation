# Paperish Presentation

Present any Obsidian note as minimal, typography-driven slides — the way Dropbox Paper did it. The deck is a projection of your rendered note: everything that renders in reading view (Bases embeds, LaTeX, callouts, embeds, community-plugin output) renders on your slides.

## Usage

Run **Paperish Presentation: Present current note** from the command palette. The note opens as slides in a new tab, split at headings (H2 by default) and `---` rules.

- **Next:** →, ↓, Space, PageDown, or click/tap
- **Previous:** ←, ↑, Shift+Space, PageUp
- **First/last slide:** Home / End
- **Fullscreen:** `f`
- **Refresh:** `r` (re-renders the note, keeping your place)
- **Exit:** Esc (returns to the source note at the current heading, configurable)

Within a slide, blocks reveal step by step (configurable: whole slides, blocks, or list items). A context bar shows the ancestor headings of the current slide.

For large decks, run "Open slide outline" to get a sidebar panel listing every slide (indented by section, current slide highlighted) — click an entry to jump straight to it.

When a slide is taller than the viewport, its heading pins to the top while you step through it ("Sticky slide heading" setting, on by default). While pinned the heading has the `pp-stuck` class, so a CSS snippet can restyle it — prefer `transform` over `font-size`, which would reflow the deck mid-scroll:

```css
.paperish-presentation .pp-stuck {
	transform: scale(0.7);
	transform-origin: top left;
	transition: transform 150ms ease;
}
```

## Per-note options

- `slides-break: h1 | h2 | h3` overrides the break level for that note.
- `title` (plus optional `description`) adds a cover slide at the start of the presentation: title large, description smaller and muted, both centered. The cover never appears in the context bar and never sticks.

## Notes and limitations (v1)

- Footnotes render at the document end, so they land on the last slide.
- The presentation is a snapshot; edits are not reflected live while you type. Press `r` (or run "Refresh presentation") to re-render in place, and by default the presentation refreshes itself when its tab regains focus after the note changed (configurable). Interactive state like callout folds resets on refresh.
- Some themes misbehave at large font scales. Use the "Extra container classes" setting plus a CSS snippet to fine-tune, e.g.:

  ```css
  .paperish-presentation.my-deck .pp-doc {
  	--pp-media-max-h: 80vh;
  	letter-spacing: -0.01em;
  }
  ```

  with `my-deck` in the extra-classes setting.
