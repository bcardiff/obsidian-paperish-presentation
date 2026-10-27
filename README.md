# Paperish Presentation

Present any Obsidian note as minimal, typography-driven slides — the way Dropbox Paper did it. The deck is a projection of your rendered note: everything that renders in reading view (Bases embeds, LaTeX, callouts, embeds, community-plugin output) renders on your slides.

## Usage

Run **Paperish Presentation: Present current note** from the command palette. The note opens as slides, split at headings (H2 by default) and `---` rules. Presenting reuses the deck tab if one is already open, so it never piles up tabs.

The presentation icon in a note's tab header opens the deck from the start. Once a deck is up, that same click becomes a jump: it lands on the slide your cursor sits on, counting `---` breaks since the last heading so several slides under one heading still resolve to the right one. ⌘-click still starts from the top — Ctrl-click on Windows and Linux, since ⌃-click is a secondary click on macOS. The icon's tooltip says which of the two you'll get. A jump leaves the cursor in the note, so you can keep writing with the deck following along beside you; starting a deck moves you into it. In reading mode, where there is no cursor, the top of what's on screen stands in for it.

**Present current note** and **Present current note from here** are the same two gestures from the palette. Either way the open deck is reused and repositioned in place — on the note it is already showing, that is a jump with no re-render.

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

Notes you want to keep for yourself go in a `presenter` callout — they are removed from the deck entirely, so they take no space and no reveal step:

```md
> [!presenter]
> Slow down here. Ask about last quarter's numbers.
```

Turn off "Hide presenter notes" in settings to present them along with everything else.

## Per-note options

- `slides-break: h1 | h2 | h3` overrides the break level for that note.
- `title` (plus optional `description`) adds a cover slide at the start of the presentation: title large, description smaller and muted, both centered. The cover never appears in the context bar and never sticks.

Those two work in either direction: open the deck where you were reading, or turn on "Sync editor from deck" and the note's own tab scrolls along as you move between slides, to the current slide's heading. It is one-way — scrolling the note never moves the deck — and it only touches tabs that are already open on that note.

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
