# Plan: piece 5 — welcome page and routing

Part of `plans/foundation.md`. Today, `index.html` is a placeholder with "coming soon" cards that link nowhere, and the player picks its series from a temporary Series select. This piece makes the welcome page the way in:

- The welcome page lists the real sources.
- A card opens `play.html#<source>`.
- The player's series-wide settings (which series, the start position and, later, the source's params) move out of the music controls into a **Series panel**. The Colour tab (piece 6) will share that panel with Music.

## Decisions to confirm

1. **Cards only for sources that exist** (π and Thue–Morse), built from `SOURCES`. The "coming soon" cards for e, φ and Nørgård go; those series get cards when pieces 7–8 add them.
   - **What a card shows:** a glyph, the name, the blurb, and the **first 32 symbols** as a preview (`3141592653…`, `0110100110…`). The preview is cheap: Thue–Morse is instant, and π's first 32 digits come from the quick on-page path.
   - **Card action:** the whole card links to `play.html#<id>`. Piece 6 adds a second action ("See it").
   - **Glyph:** sources gain an optional `glyph` field: `'π'` for π and `'01'` for Thue–Morse.
2. **Route format:** `play.html#<id>`, with `?key=value` params for later sources: `#pi?base=12` in piece 7.
   - **Parsing:** a pure `app/route.js` (`parseRoute`, `formatRoute`), with tests.
   - **Unknown ids:** an unknown or missing id sends the player back to the welcome page (`location.replace('index.html')`) rather than silently picking π.
   - **Start position:** not in the URL for now. Adding `start=` later would make links shareable, and the route module already allows it.
3. **The player's head panel is reorganised:**
   - **Left, the Series panel** (shared by Music and Colour): the series name with a "← All series" link back to the welcome page, then the start position with its presets and random start.
   - **Right, the playback panel** (Music only): the Length row (Notes/Time/Infinite, with count or duration), then Play, the status and progress.
   - The temporary Series select goes.

   ```
   ┌ Series ──────────────────────────────┬ Playback ─────────────────────┐
   │ π                     ← All series   │ Length [Notes ▾]  Notes [24]  │
   │ The ratio of a circle's …            │                               │
   │ Start at position [0           ]     │ [ Play ]  12 sec at 110 BPM   │
   │ (0) (1,000) (100,000) (1M) (4M) …    │ ▓▓▓▓▓░░░ Summing 40% [Cancel] │
   │ [🎲 Random] up to [1M ▾] ☐ each play │                               │
   └──────────────────────────────────────┴───────────────────────────────┘
   ```
4. **Module split:**
   - The start-position code (reading and validating it, presets, random) moves from `controls.js` into `app/start.js`, which the Colour tab can reuse.
   - `app/series-panel.js` renders the panel's heading for the current source.
   - `app/welcome.js` renders the cards.

## Steps (each committed and pushed on its own)

**5a. Routes.**
- Add `app/route.js` and its tests.
- The player reads the route, and returns to the welcome page for unknown ids. The Series select is removed.
- **Browser check:** `#thue-morse` opens Thue–Morse, `#nope` and a bare `play.html` land on the welcome page, and browser Back and Forward between two series work.

**5b. The Series panel.**
- Add `app/start.js` and `app/series-panel.js`, and reorganise the head panel as above.
- **Checks:**
  - `controls.js` no longer touches the start fields.
  - The 72-setting chip comparison against the prototype still passes.
  - The pinned-code reload check still passes.
  - A screenshot at desktop and phone widths.

**5c. The welcome page.**
- Add `app/welcome.js`, cards from `SOURCES` with glyph, blurb and preview, and the `glyph` source field.
- **Checks:**
  - `tests/site.test.js` checks that every card's link resolves to a source.
  - In the browser, both cards open their player.
  - A screenshot at desktop and phone widths.
- **Wrap-up:** update the README and handoff, then deploy.

## Not in this piece

- The Colour tab (piece 6). The Series panel is shaped for it, but Music stays the only view.
- Source params in the UI. No source has any until piece 7; the panel gets a slot for them then.
