# Plan: piece 6 — the Colour view

Part of `plans/foundation.md`. The Pi Color Generator prototype (`prototypes/pi-color-generator.html`, 379 lines) becomes a second view of the player, beside Music. Both views read the same source, supply and start position from the shared Series panel.

The prototype's parts:
- **Seven colour modes**, each reading `dpc` digits per cell: RGB 9 and 6, hex literal, HSL, grey, a 10-colour palette, and CMYK.
- **Four fill orders:** rows, snake, columns and spiral.
- **Size and pixel-size presets.**
- **A hover/tap inspector,** "Digits used" and "First 40 colours" lists, "Copy colours" and "Open PNG".

## Decisions to confirm

1. **A page-level Music | Colour switch** sits as two tabs between the heading and the panels. The Series panel stays and is shared. Each view brings its own parts:

   | Place | Music | Colour |
   |---|---|---|
   | Left column | Scheme, Sound | **Colour**: mode (with its hint), fill order, readout format |
   | Head panel, right | Playback (Length, Play, status) | **Image**: size W×H with presets, pixel size with presets, Copy colours, Download PNG, status |
   | Stage card | Digits → notes / Piano roll / Sheet music | The canvas and inspector readout, then "Digits used" and "First 40 colours" |

   - **Switching** to Colour stops any playback. The views are just shown and hidden, so each one keeps its settings.
2. **Routes name the view:** `play.html#pi` is Music and `play.html#pi/color` is Colour, as `#<id>[/<view>][?params]`.
   - **Welcome cards** get a second action, "See it →", beside "Hear it →", and the lede goes back to "hear it or see it".
   - **Tabs and the URL:** switching tabs updates the hash, so Back returns to the other view.
3. **Shared start and limits:**
   - **Start position:** the colour prototype's own offset field, its presets (0, 1, 100, 1,000, 10,000, 31,415) and its "Random offset" (0–50,000) give way to the Series panel's start position, presets and random start.
   - **Limits:** the prototype stopped at 400,000 digits. Now the limit is the source's `maxLength`, and the size shrinks to fit, as in the prototype ("size reduced to fit the available digits").
   - **Beyond `quickLength`,** the Colour view shows "press Compute", much like Music's "press Play". That runs the same foreground computation.
4. **The progress bar and Cancel move into the Series panel,** since computing belongs to the series, not to one view. Music's Play and Colour's Compute both start it.
5. **Colour modes for any base,** like the music schemes:
   - Each mode declares `accepts(seq)`.
   - **Scaled modes** (RGB 9 and 6, grey, CMYK) divide by `base^n − 1` instead of the prototype's fixed 999 or 99. That's identical for base 10, and on Thue–Morse it still spans the full range.
   - **HSL and hex literal stay base-10 only.** HSL's hue is "first 3 digits mod 360", and hex literal reads the digits as hex as they stand.
   - **Palette** takes any base up to 10.
   - So Thue–Morse gets palette, RGB, grey and CMYK.
6. **Deviations from the prototype:**
   - "Open PNG" becomes **Download PNG**, because pop-up blockers often stop a new window.
   - "Digits used" drops the prototype's π-only "3." prefix.
   - Generation runs on every change, as the prototype did, with no separate Generate button. Past `quickLength`, Compute plays that role.

## Modules (one job each)

| Module | Job | From the prototype |
|---|---|---|
| `mappings/color/convert.js` (pure) | `hexToRgb`, `hsl2rgb`, `rgb2hsl`, `formatColor(rgb, kind)` | the same, `fmt` |
| `mappings/color/modes.js` (pure) | `MODES`: `{ id, name, hint, dpc, accepts(seq), color(symbols, base) }` | `modes`, `pal10` |
| `mappings/color/order.js` (pure) | `cellOrder(w, h, kind)` | `order` |
| `mappings/color/image.js` (pure) | `fitSize(…)` (shrink to the available symbols), `buildCells(seq, start, w, h, mode, order)` | the size-fitting and cell loop in `generate` |
| `app/route.js` | gains `view` | — |
| `app/play.js` | The page entry: route, source, supply, Series panel, progress, and the view switch. It hands the source to each view. | today's `music/player.js` top level |
| `app/views.js` | The Music | Colour tabs and showing each view's parts | — |
| `app/music/player.js` | Becomes the Music view: `initMusic()`, `setSource(source, supply)`, `refresh()`, `stop()` | — |
| `app/color/controls.js` | The Colour and Image forms, with preset pills | `pills`, `readInt`, the presets |
| `app/color/canvas.js` | Drawing cells (within the browser's canvas size limit), `cellAt` | `draw`, `cellAt` |
| `app/color/lists.js` | The inspector readout, "Digits used", "First 40 colours" | `inspect`, `showDigits`, `showList` |
| `app/color/export.js` | Copy colours, Download PNG | the copy and save handlers |
| `app/color/view.js` | Wiring for the Colour view | `generate` |
| `app/color/color.css` | Colour view styles | lines 10–54 |

## Steps (each committed and pushed on its own)

**6a. The colour core.**
- Add `mappings/color/*`.
- **Tests:**
  - Loaded from the prototype's script in a `vm` context, every mode × order × size × start gives cells identical to the prototype's on π.
  - `formatColor` matches for all four formats.
  - Thue–Morse cells span each channel's full range.
  - `accepts` follows the rules above.

**6b. The page restructure, Music only.**
- Add `app/play.js`, `app/views.js`, and the route's view, and move the progress bar into the Series panel. Music becomes a view module, with a Colour tab that shows a placeholder.
- **Checks:** the 72-setting chip comparison and the 4c/4d playback, refill and download checks still pass. Routes with views, and Back between views, work.

**6c. The Colour view.**
- Add `app/color/*` and its markup and CSS.
- **Browser comparison with the prototype** at the same settings (mode, order, size, start), on all 7 modes × 4 orders: identical "First 40 colours" lists, "Digits used" text and canvas pixels. Also the inspector readout and the downloads.
- **Also checked:** pending and Compute past `quickLength`, size fitting, Thue–Morse, and screenshots at desktop and phone widths, light and dark.

**6d. Wrap-up.**
- Welcome cards get "See it →", and the lede is restored.
- Update the README, foundation plan and handoff, then deploy and check the live site.

## Not in this piece

- New colour modes, or bases above 10 (piece 7).
- Colour for `int` series (piece 8).
- Animation, or colour synced to the music.
