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

## Per-note options

Frontmatter `slides-break: h1 | h2 | h3` overrides the break level for that note.

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
