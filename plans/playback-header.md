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

## After each piece

README updated, browser suite run, commit; deploy when you say.

## Decisions (2026-11-24)

1. Collapsed-card summaries in the headings: **kept**.
2. Phones: settings cards **collapsed by default**.
