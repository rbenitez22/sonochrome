# Plan: Playback as the music card's header, a play icon on phones, collapsible panels on phones

Requested on 2026-11-24. The Playback card leaves the left column and becomes a one-row header on the music card (the output panel with Digits → notes, Piano roll, Sheet music). On phones the Play button shrinks to an icon, and the settings cards can be collapsed so the output is reached with less scrolling.

## Piece 1 — Playback row on top of the music card

- **Markup (`public/play.html`):** the Playback `<section>` is removed. Its contents move into the music card as a new first row, above the tab strip:
  `[Length ▾] [Notes to play | Time (m:ss)] [Play] status`
  - Labels stay above the two fields (small, as now), so every control keeps its `<label for>`.
  - The status text takes the rest of the row and wraps when long ("Stopped: no more computed digits. Played …").
  - The `durErr` error shows under the Time field, as now.
- **Ids:** all control ids (`lenMode`, `count`, `duration`, `play`, `status`, …) are unchanged, so `player.js`, `controls.js` and the tests need no changes. The id `musicParts` (the target of the Music view tab's `aria-controls`) moves to the music card, which already carries `data-view="music"`.
- **Play button:** shorter, padding 14px → about 8px top and bottom, same width; it lines up with the bottom of the fields.
- **CSS (`player.css`):** a `.playback-row` block (flex, wraps on narrow widths: fields on one line, Play + status on the next). The order rules for `.playback-card` go. Left column on Music becomes Series, Scheme, Sound. Phones: Series, music card, Scheme, Sound.
- **Header comment and `plans/wide-layout.md`'s order notes:** updated to the new order.
- **Checks:** the browser suite passes unchanged (it uses ids). Screenshots at 1440, 1280 and a phone width.

## Piece 2 — Play as an icon on phones

- The button holds an inline SVG icon and a text label: `<button id="play"><svg …/><span class="play-label">Play</span></button>`. The icon is a right-pointing triangle while stopped and a square while playing (Stop).
- `player.js`: the two `$('play').textContent = …` lines become one small `showPlaying(on)` that sets the label text and a `data-playing` attribute (the CSS swaps the icon). Setting `textContent` on the button would wipe the icon.
- Wide screens: label only (as now). Under 600 px: icon only, label visually hidden but still read by screen readers and still the button's text, so the tests' `toHaveText('Play'/'Stop')` keep working.
- **Checks:** suite passes; a new test at a phone viewport checks the icon is visible and the button's accessible name toggles Play/Stop.

## Piece 3 — Collapsible settings cards on phones

- Applies under 900 px only; on desktop nothing changes (headings stay plain, nothing collapses).
- Cards: Series, Scheme, Sound (Music); Series, Colour, Image (Colour). Not the output cards.
- Each card's `<h2>` gets a button inside it (`aria-expanded`, `aria-controls` the card body) with a chevron. Tapping it hides or shows the card's body.
- When collapsed, the heading shows a one-line summary so the card is still informative, e.g. Series: "π · from 4,000,000"; Scheme: "Codes, 4 digits"; Sound: "C major · 2 instruments · 110 BPM". (Can drop the summaries if you'd rather keep it minimal.)
- **Default:** collapsed on phones, so the music card is right under the Series heading. The open/closed state per card is remembered in `localStorage`.
- New module `public/src/app/collapse.js` (wiring + state only); summaries come from small functions next to each card's existing code.
- **Checks:** a phone-viewport test: cards start collapsed, tapping expands, state survives a reload; on desktop the bodies are always visible.

## Piece 4 — Colour: a header row on the Result card, Compute always there

Requested on 2026-11-24, after piece 3. Today Compute shows (in the Image card) only while digits are missing, so it disappears once they are computed, and "Random each play" does nothing on Colour.

- **Result card header row** (all widths, like Music's playback row): `[Draw] [Copy colors] [Download PNG]` then the status. These move out of the Image card, which becomes settings only (its `data-collapse-keep` marks go).
- **The main button is always visible:**
  - Digits missing → labelled **Compute**: computes them, then draws (as now).
  - **Random each time** ticked → labelled **Draw**: picks a new random start (within "up to"), then draws, computing first if needed. Pressing it again gives a new random swatch each time.
  - Otherwise → labelled **Draw**: redraws from the current settings (images already redraw on every change, so this mostly confirms the current image).
- **Wording:** "Random each play" becomes **"Random each time"**, shared by both views (Music still picks a new start on each Play).
- Phones: on Colour, the order becomes Series, Colour, Image (all collapsed), then the Result card with its header row near the top.
- **Checks:** a test that Draw with Random each time changes the start and the image; that Compute shows while digits are missing and turns back to Draw; the existing colour tests updated for the moved buttons.

## Follow-ups (2026-11-24)

- Phones: the sheet music tools (Clef, Key signature, downloads) wrap inside the music card instead of overflowing it.
- Phones, Music: Scheme and Sound move above the music card (Series, Scheme, Sound, music card), as on Colour, since all settings cards are collapsed.
- Sheet music downloads as icons (both widths): MusicXML is two beamed eighths whose second note is a detached download arrow with a tray; MIDI is a speaker with the same arrow. Labels stay as screen-reader text, tooltips from `title`.

## After each piece

README updated, browser suite run, commit; deploy when you say.

## Decisions (2026-11-24)

1. Collapsed-card summaries in the headings: **kept**.
2. Phones: settings cards **collapsed by default**.
