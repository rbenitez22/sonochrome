# Plan: a wider player, with every panel in the left column

Requested on 2026-11-21, between pieces 7a and 7b; the user chose "both views". On the Colour view the image should be fully in view without scrolling. So the Series and Image panels move into the left column under the Colour card, and the page gets wider so they fit. Music gets the same arrangement.

## Layout

- **Page width:** from 1280 px to **1440 px**. The left column goes from 340 px to **440 px**, wide enough for the Series panel (start presets, the random row) and the Image panel (size pills, buttons).
- **Head panel removed:** the Series panel and the view's panel (Playback or Image) become cards in the left column. The right column (the stage) holds only the active view's card, at full height.
- **Left column, top to bottom:**
  - **Colour:** Series, then Colour, then Image. (First Colour, Series, Image; on 2026-11-21 the user asked for Series first, as in Music.)
  - **Music:** Series, then Playback, then Scheme, then Sound. Playback stays near the top so Play is visible without scrolling; below Scheme, which is tall with the pinned codes, it would fall off a 900 px-high screen. (Superseded 2026-11-24 by `playback-header.md`: Playback is now the music card's header row.)
- **Phones (under 900 px):** one column, by the same rule as now: settings needed to start come first, then the view, then the rest.
  - **Music:** Series, Playback, the music card, Scheme, Sound.
  - **Colour:** Series, Colour, Image, the Result card.
  - The left column and stage are flattened (`display: contents`), so CSS `order` can interleave their cards.
- **How it's done:** the per-view order is CSS `order`, keyed on `data-view` on `<main>`, which `showViewParts` sets. There's no DOM moving, and element ids don't change, so the scripts and browser checks keep working.

## Checks

- The browser checks for pieces 4–6 still pass: chip and colour parity with the prototypes, playback, the views and the downloads.
- Screenshots at 1440 and 1280 px wide and on a phone, for both views. At 1440×900 the default 16×16 image and the Result card fit without scrolling the page.
