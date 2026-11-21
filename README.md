# Sonochrome

Music and colour from number series. Pick a series (π, e, the golden ratio, Nørgård's infinity series, Recamán's sequence and others), then **hear** it as a melody with a score, or **see** it as an image. Any long series that never falls into a loop can drive both.

*Sono-* (sound) + *-chrome* (colour). The project was named Chromatone until 2026-11-21.

Sonochrome generalises two single-file prototypes, kept unchanged in `prototypes/`:
- `pi-notes.html`: the digits of π → melody, piano roll and sheet music, with MusicXML download. Copied from pi-notes at commit `a51e4e5`.
- `pi-color-generator.html`: the digits of π → coloured cells.

**Status:** pieces 1–8 of `plans/foundation.md` are done. Nine series: the constants π, e, √2, φ and ln 2 (each in bases 2–8, 10, 12 or 16); the binary words Thue–Morse and the Fibonacci word; and the integer series of Nørgård and Recamán. Each can be shown as **music** (at parity with the Pi Notes prototype) or **colour** (at parity with the Pi Color Generator), and the welcome page links to both views. Plans: `plans/music-core.md`, `plans/music-player.md`, `plans/welcome-and-routing.md`, `plans/colour-tab.md`, `plans/wide-layout.md`, `plans/constants-and-bases.md`, `plans/integer-series.md`. Next: the foundation plan's "Later" list.

## Layout

```
public/          the deployed site: only this folder is served
  index.html     welcome page: one card per source, linking to its Music and Colour views
  play.html      the player: play.html#<source id>, e.g. play.html#thue-morse
  favicon.svg    the icon: π drawn as two beamed eighth notes (the bar is the beam, the legs the stems)
  _headers       response headers for Cloudflare
  src/sources/   one ES module per series, plus the shared seq helpers (see Sources)
  src/workers/   digits.js: module Web Worker that computes constants from position 0
  src/mappings/music/   symbols → notes (pure, no DOM; see Music mappings)
  src/mappings/color/   symbols → colours (pure, no DOM; see Colour mappings)
  src/app/       the pages' code: supply.js (symbols for the page), music/ (the player; see Player)
tests/           node --test (no dependencies)
prototypes/      the two original HTML apps, for reference and equivalence tests
plans/           design plans, one per feature
wrangler.jsonc   Cloudflare config
```

Planned under `public/src/` (see `plans/foundation.md`):
- `app/music/`: the player's views and audio, and `app/color/` later.

## Sources

A **source** is one series. Each lives in `public/src/sources/<id>.js` and default-exports:

```js
export default {
  id: 'thue-morse',            // used in URLs and the registry
  name: 'Thue–Morse',
  glyph: '01',                 // optional: the welcome card's symbol (defaults to name)
  blurb: 'One line for the welcome card.',
  kind: 'digit',               // 'digit' (symbols 0..base-1) or 'int' (unbounded integers; none yet)
  params: [],                  // user-facing settings, e.g. { id, label, choices, default }
  maxLength: Number.MAX_SAFE_INTEGER,
  quickLength: Number.MAX_SAFE_INTEGER,  // optional: positions prepare() gives without a noticeable wait
  estimateSeconds(upTo) { return 2 },   // optional: rough compute time, for the "about N sec" hint
  async prepare(params, upTo, report, options) { return seq },
};
```

- **`prepare(params, upTo, report = () => {}, { signal, allowInline } = {})`** makes positions `[0, upTo)` available and resolves with a **seq**. `report(p, label)` receives progress from 0 to 1.
  - `signal` (an `AbortSignal`) cancels a running computation; the promise rejects with an `AbortError`.
  - `allowInline: false` makes it fail rather than compute on the page when Web Workers are unavailable (for background refills that must not freeze playback).
- **`quickLength`** (optional, default 0) is how far the player prepares as settings change; past it, the user presses Play to compute. π: 20,000. Thue–Morse: all of it.
- **`estimateSeconds(upTo)`** (optional) is a rough compute time on a laptop. Only π has one.
- **A seq** is `{ length, base, at(i), slice(i, j) }`. Integer series (`kind: 'int'`) have `base: null`, and `symbolString(values, null)` shows their terms comma-separated.
  - `length` may exceed `upTo`; `base` is the alphabet size of a digit source, or `null` for integer sources.
  - `at(i)` returns a number and throws a `RangeError` outside `0..length-1`.
  - `slice(i, j)` returns an array of numbers and clamps its range like `Array.prototype.slice` (no negative indices).
- **Helpers** in `seq.js`:
  - `digitStringSeq(text, base)` wraps a string of digit characters;
  - `formulaSeq(length, base, term)` wraps a function of the position;
  - `arraySeq(values, length, base = null)` wraps a growing array (Recamán).
- **Registry** in `sources/index.js`: `SOURCES` (in welcome-page order) and `sourceById(id)`, which returns `null` for an unknown id.

```js
import { sourceById } from './src/sources/index.js';
const seq = await sourceById('pi').prepare({}, 100_000, (p, label) => console.log(p, label));
seq.slice(0, 5); // [3, 1, 4, 1, 5]
```

| Source | Kind | Cost |
|---|---|---|
| `pi` (π), `e`, `sqrt2` (√2), `phi` (φ), `ln2` (ln 2) | digit, in base 2, 3, 4, 5, 6, 7, 8, 10, 12 or 16 (param `base`, default 10), up to 20,000,000 digits | Built by `makeConstant` in `sources/constant.js`, and computed from position 0. Up to 20,000 digits are computed on the page with the BigInt engine; π in base 10 uses Machin's formula there, exactly as in the prototype. Beyond that, the digits worker computes them with GMP (gmp-wasm 1.3.2 ESM from jsDelivr), or with BigInt if GMP can't load (Firefox's BigInt stops at about 157k decimal digits). One digit string is cached per base. A longer request recomputes from 0 and keeps the longest. Background requests (`allowInline: false`) always use the worker, however short. Position 0 is the first digit of the integer part, so ln 2 starts `0693…`. |
| `thue-morse` | digit, base 2 | A formula (the parity of the 1 bits in n), so any position is instant and `prepare` does nothing. |
| `fibonacci-word` (A003849) | digit, base 2 | The exact formula a(n) = 2 + ⌊(n+1)φ⌋ − ⌊(n+2)φ⌋, with ⌊nφ⌋ = ⌊(n + ⌊√5·n⌋)/2⌋ (Number arithmetic below 40M, BigInt above). Any position is instant. |
| `norgard` (A004718) | int, signed and small | Nørgård's infinity series. A formula from the bits of n: a 1 adds one, a 0 negates. Any position is instant.  |
| `recaman` (A005132) | int, ≥ 0, growing (to about 6M) | Computed from 0 on the page and extended as needed (1M terms in about 12 ms, plus an 8 MB visited bitmap). Capped at 1,000,000 terms. |

**Constants** (`sources/constant.js`): `makeConstant({ id, name, glyph, blurb, quick })` builds a source from an `ENGINES` id. `readBase(params)` turns `{ base: '12' }` into 12; a missing base, or one not in `BASES`, means 10.

```js
const seq = await sourceById('e').prepare({ base: '12' }, 1000);   // e in base 12: 2.875236069821…
seq.base;   // 12
```

**Engines** (`sources/engines.js`): for each constant id (`pi`, `e`, `sqrt2`, `phi`, `ln2`), `ENGINES[id]` has `bigint(n, report, base)` and `gmp(binding, n, report, base)`. Both return ⌊x · baseⁿ⌋ written in that base, so π is `'314159…'` in base 10 and `'3243f6a8…'` in base 16. There is no leading `0` when x < 1.

| Constant | Method |
|---|---|
| π | Chudnovsky, binary splitting |
| e | Σ 1/k!, binary splitting |
| √2 | integer square root of 2·base²ⁿ |
| φ | (baseⁿ + ⌊√(5·base²ⁿ)⌋) / 2 |
| ln 2 | 18·atanh(1/26) − 2·atanh(1/4801) + 8·atanh(1/8749), each by binary splitting |

The BigInt versions agree with separate simple series, and with exact squaring for √2 and φ, for 2,000 digits in bases 2, 3, 7, 10, 12 and 16 (`tests/engines.test.js`). GMP matches BigInt exactly up to 300,000 digits in the browser.

**The digits worker** (`workers/digits.js`) takes `{ constant, count, base }` and replies with `{ p, l }` progress, then `{ done, engine }` or `{ error, engine }`. Sources call it through `computeConstant(constant, count, { base, inline, report, signal, allowInline })` in `sources/constant-worker.js`. A new constant adds its two engines to `ENGINES` in `sources/engines.js`.

**Start positions** (`sources/position.js`): `parseStart('250k')` → `250000` (accepts `4M`, `1.5k`, `4,000,000`; `null` if it isn't a number), and `randomStart(max, rnd = Math.random)` → a uniform integer in `[0, max]`. The caller passes the limit, normally from the source's `maxLength`.

**Adding a source:** write `sources/<id>.js` with the default export above, add it to `SOURCES`, and add tests: a known prefix (OEIS for integer series) plus the shared `slice`/`at` check in `tests/sources.test.js`. `tests/music-sources.test.js` then runs the music core on it automatically.

## Music mappings

`public/src/mappings/music/` turns any seq into notes. These modules are moved from the `// <pure>` section of `prototypes/pi-notes.html`, and tests check that their output on π is identical to the prototype's (`tests/music-equivalence.js` loads the prototype in a `vm` context for this). Settings for one voice are `s = { scheme, codeLen, fixedLen, range, root, scale, oct }`.

| Module | Exports |
|---|---|
| `theory.js` | `NAMES` (flat spellings), `SCALES` (name → semitones), `midiName(60)` → `'C4'`, `noteToMidi('Bb3')` → `58` (or `null`), `fmtLen(1.5)` → `'3/8'`, `quant(b)` (snap beats to the sixteenth grid) |
| `overrides.js` | `parseOverrides(text, codeLen)` → `{ map, errors }`: pinned codes such as `2635 = Bb3 1/4` or `1459 = rest`, for the `codes` scheme |
| `schemes.js` | `SCHEMES` (`{ id, label, accepts(seq) }`), `chunkSize(s)`, `decodeChunk(s, chunk, overrides, rd)`, `symbolsPerBeat(s)`, and the tables `PAIR_LEN`, `CODE_LEN`, `STEPS` |
| `reader.js` | `newReader(s, pos)` → `{ pos, cur }`, `readEvent(s, seq, overrides, rd)` → an event or `null` when the seq is too short, `symbolString(values)` |
| `voices.js` | `buildCountVoices(s, seq, overrides, octs)` → `{ voices: [{ events, total }], nextPos }` (Notes mode); `newStream(s, octs)`, `buildBar(stream, seq, overrides, limit = Infinity)` → `{ events, barEnd, done }` or `null` (Time/Infinite); `regenerateVoices(s, seq, overrides, octs, limit)` |
| `measures.js` | `toMeasures(events)` and `measuresInRange(events, fromBeat, toBeat, off = 0)` → bars of pieces `{ ei, rest, midi, beats, tie }`; `decompose(beats)`, `exportBeats(played)`, `chooseClef(events, 'auto'\|'treble'\|'bass')` |
| `musicxml.js` | `toMusicXML(score)` → a MusicXML 4.0 string; `padBars(partsBars)`, `xmlEscape(text)`, `XML_DIVISIONS` (4 per quarter) |
| `timing.js` | `parseDuration('1:30')` → `90` (or `null`), `fmtTime(3723)` → `'1:02:03'`, `beatsForSeconds(sec, bpm)`, `streamSymbols(s, nv, beats)`, `symbolsNeeded(s, nv)`, `DURATION_MIN`/`DURATION_MAX` (5 s and 99:59) |

```js
import { newReader, readEvent } from './src/mappings/music/reader.js';
const s = { scheme: 'degrees', codeLen: 4, fixedLen: 1, range: 2, root: 0, scale: 'Major', oct: 4 };
const rd = newReader(s, 0);
readEvent(s, seq, {}, rd); // { rest: false, midi: 65, beats: 1, at: 0, symbols: '3', label: 'F4' }
```

- **An event** is `{ rest, midi, beats, at, symbols, label }`, plus `pinned: true` when a pinned code supplied it. `at` is the position of its first symbol. `symbols` holds one character per symbol (`0-9`, then `a-z`); for base 10 these are the digits themselves, which is what pinned-code keys match.
- **Which seqs a scheme reads:** `accepts(seq)` returns `true` or a reason string.
  - `codes` needs base 10, since its rules (`÷9`, `mod 7`) are tuned for decimal.
  - `degrees` reads any digit base. In base 12 with the Chromatic scale, each digit is one semitone.
  - `pairs` and `steps` read bases up to 10, because they index 10-entry tables.
  - `values` and `intervals` read **integer series** only (Nørgård, Recamán), one term per event, with the fixed note length and the Range setting. Positions past the range wrap around to the other end.
    - **`values`:** "Value = scale step (centred)". The term counts scale steps from the middle of the range.
    - **`intervals`:** "Differences = melodic steps". Each term moves the melody by its difference from the previous term (kept as `rd.prev`, saved and restored with the stream).
  - **Event spans:** integer events carry `span` (positions read), since one term can be several characters. `eventSpan(e)` gives the span for any event.

- **Voices:** `octs` lists one octave per voice, voice 1 first. Voice settings add `start` (the first position read) and, for Notes mode, `count` (voice 1's number of events).
  - **Notes mode:** voice 1 plays `count` events. Each later voice reads the symbols after the previous one and fills the same number of beats, so its last note is cut to fit.
  - **Time/Infinite:** each `buildBar` call fills one 4/4 bar, voice by voice, from where the previous voice stopped reading. Notes may cross the barline, and only `limit` cuts one.
  - **Short seqs:** when the seq is too short, `buildBar` returns `null` and leaves the stream unchanged, so it can be retried once `prepare` delivers more symbols.
  - **Rebuilding:** `regenerateVoices` rebuilds a streamed piece identically, for export.
- **Sizing:** `streamSymbols` is how many symbols past the start to have ready for `beats` of streaming, with 50% headroom. `symbolsNeeded` is the position a Notes-mode piece must reach.

```js
import { newStream, buildBar } from './src/mappings/music/voices.js';
const st = newStream({ ...s, start: 0 }, [4, 3]);   // two voices, octaves 4 and 3
const bar = buildBar(st, seq, {});                  // { events: [[…], […]], barEnd: 4, done: false }
```

- **Bars:** pieces lie on a sixteenth-note grid. A note that crosses a barline becomes tied pieces, and time no event covers becomes rests. `ei` is the index of a piece's event (plus `off`), or `-1` for a filler rest.
  - `measuresInRange` cuts a window `[fromBeat, toBeat)`, both on barlines, out of a stream.
  - `exportBeats` rounds a played length up to the next barline, with one bar at least.
  - `chooseClef` with `'auto'` picks bass when the average pitch is below A3.
- **MusicXML:** `score = { title, subtitle, bpm, parts: [{ name, program, clef, bars }] }`, where `program` is a General MIDI program (1-based). Pad the parts to equal length with `padBars` first. The output says `<software>Sonochrome</software>`, which is the only difference from the prototype's output.

```js
import { regenerateVoices } from './src/mappings/music/voices.js';
import { measuresInRange, exportBeats, chooseClef } from './src/mappings/music/measures.js';
import { toMusicXML, padBars } from './src/mappings/music/musicxml.js';
const limit = exportBeats(30.5);                                  // 32 beats = 8 bars
const voices = regenerateVoices({ ...s, start: 0 }, seq, {}, [4, 2], limit);
const bars = padBars(voices.map((v) => measuresInRange(v, 0, limit)));
const xml = toMusicXML({ title: 'π', subtitle: 'From 0', bpm: 100,
  parts: bars.map((b, k) => ({ name: 'Voice ' + (k + 1), program: 1, clef: chooseClef(voices[k], 'auto'), bars: b })) });
```

**Tests** (`tests/music-*.test.js`):
- **Equivalence with the prototype:** on π, every module's output is identical to the Pi Notes prototype's for the same settings. That covers the 11,520-case Notes grid, streaming bar by bar, bars and 48 MusicXML scores.
- **Every source:** `tests/music-sources.test.js` runs the whole core (Notes mode, streaming, regeneration, bars, MusicXML) on every source in `SOURCES`, with every scheme that accepts it. It checks what must hold for any series: notes come out, beats add up, events point back at their symbols, and the score is sound (`tests/musicxml-checks.js`).
- **No π in the core:** the same file fails if anything in `mappings/music/` mentions π.

## Colour mappings

`public/src/mappings/color/` turns any seq into an image. The modules are moved from `prototypes/pi-color-generator.html`, and on π their cells are identical to the prototype's (`tests/color-core.test.js`).

| Module | Exports |
|---|---|
| `modes.js` | `MODES` (`{ id, name, hint, dpc, accepts(seq), color(symbols, base) }`), `modeById(id)` |
| `order.js` | `ORDERS` (`[kind, label]`), `cellOrder(w, h, kind)` → `[x, y]` per cell in fill order: `row`, `snake`, `col` or `spiral` |
| `image.js` | `fitSize(w, h, dpc, start, limit)` → `{ w, h, reduced }`, `buildCells(seq, start, w, h, mode, orderKind)` → `{ cells, order }`, `symbolsNeeded(start, w, h, dpc)` |
| `convert.js` | `formatColor(rgb, 'hex'\|'rgb'\|'hsl'\|'dec')`, `hexToRgb`, `hsl2rgb`, `rgb2hsl` |

```js
import { buildCells } from './src/mappings/color/image.js';
import { modeById } from './src/mappings/color/modes.js';
const { cells } = buildCells(seq, 0, 16, 16, modeById('rgb3'), 'spiral');
cells[0]; // { start, symbols: '…', rgb: [r, g, b] } for the cell at (0, 0)
```

- **Integer series:** two modes read one term per cell.
  - `wheel`: "Colour wheel · value mod 12", twelve evenly spaced hues.
  - `shade`: "Shade · lowest to highest in the image", grey scaled between the image's smallest and largest term (`needsRange`; `buildCells` passes the range).
  - The digit modes refuse integer series.
- **Any base:** RGB 9, RGB 6, grey and CMYK scale each n-symbol group by `base^n − 1`, which is exactly the prototype's 999 or 99 for base 10. The palette takes bases up to 10. HSL and hex literal are base-10 only, since they read decimal digits as they stand.
  - Thue–Morse never repeats a block three times, so its RGB 9 levels run from 1/7 to 6/7 rather than 0 to 1.
- **Spiral fix:** the prototype's spiral gave up after `8·w·h` steps, leaving cells out of long thin images (300×1). The limit now follows the longest side, and every order fills every cell exactly once (tested).

## Welcome page

`public/index.html` lists every source in `SOURCES` as a card (`app/welcome.js`). Each card shows:
- the source's `glyph` and its name (only announced, not shown, when the glyph is the name, as with π);
- its blurb, and its first 32 symbols when it has them without a wait (`quickLength ≥ 32`);
- **Hear it →** opens `play.html#<id>` (Music) and **See it →** opens `play.html#<id>/color` (Colour), both built with `playerHref`. The player's "← All series" link comes back.

Without JavaScript the page shows direct links to the players instead.

## Player

`public/play.html` is the music player, at parity with the Pi Notes prototype's layout and controls. It opens the source named by the route in the hash, and an unknown or missing id sends the browser back to the welcome page.

**Routes** (`app/route.js`): `#<source id>[/<view>][?key=value…]`. The view is `music` (the default, left out of the hash) or `color`. The optional params are the source's, for later sources (`#pi?base=12` in piece 7). Values stay strings; each source converts its own.

```js
parseRoute('#pi/color?base=12');           // { id: 'pi', view: 'color', params: { base: '12' } }
formatRoute('pi', { base: 12 });           // '#pi?base=12'
playerHref('thue-morse', {}, 'color');     // 'play.html#thue-morse/color'
```

Changing the hash switches series or view in place, so browser Back and Forward move between them.

**Views:** **Music | Colour** tabs under the heading switch the page between views. Every element of one view carries `data-view="music"` or `data-view="color"`, and only the active view's are shown. Switching to Colour stops playback, and each view keeps its own settings.

**Layout** (`plans/wide-layout.md`): the page is up to 1440 px wide. A 440 px left column holds every settings card, and the right column holds the active view's card at full height, so a Colour image or the music views are fully in view.
- **Left column, top to bottom:**
  - **Music:** Series, Playback (Length, Play, status), Scheme, Sound.
  - **Colour:** Series, Colour (mode, fill order, readout format), Image (size and pixel size with presets, Copy colors, Download PNG, status).
- **Series card** (shared by both views):
  - the series name, its description and a "← All series" link;
  - the source's params: a **Base** select for the constants, kept in the route as `?base=12` (left out at the default of 10);
  - the start position, with presets and random start;
  - the progress bar and Cancel, when a view needs digits computed first.
- **Card order** is CSS `order`, keyed on `main[data-active-view]`, which `showViewParts` sets. No elements move.
- **Phones (under 900 px):** everything is one column: Series, Playback or the Colour options and Image, then the view, then the rest.
- **Colour view behaviour:**
  - The image is rebuilt on every change. Past `quickLength`, a **Compute** button computes first, and an image that would read past `maxLength` shrinks to fit.
  - Modes a source refuses are disabled, with the reason (HSL and hex literal on Thue–Morse).

**Colour parity with `prototypes/pi-color-generator.html`** (Chromium and Firefox, 2026-11-21): 112 settings (7 modes × 4 orders × 2 sizes × 2 starts) give identical colour lists, "Digits used" text and canvas pixels, and the readout matches. The differences are deliberate:
- the start position comes from the Series panel;
- Download PNG replaces "Open PNG";
- "Digits used" drops the π-only "3." prefix;
- the spiral covers long thin images.

**Music parity with the prototype** (checked in Chromium and Firefox on 2026-11-21):
- For 72 settings (every scheme and code length, 1 or 3 voices, Notes/Time/Infinite, two starts), the chips match `prototypes/pi-notes.html` exactly, including the pending "press Play to compute" state.
- The status lines and the score agree, and pinned codes survive Firefox's form restore the same way.
- **Deliberate differences:** the heading, "position" in the start label, and the hidden 20M preset (π's last position is 19,999,999).

Modules behind the page, each with one job:

| Module | Job |
|---|---|
| `app/dom.js` | `$(id)`, `fmtN(n)`, `fillSelect(select, [[value, label]])` |
| `app/progress.js` | `showProgress(p, label, startedAt)`, `hideProgress()` |
| `app/start.js` | The start position in the Series panel: `initStart(onChange)`, `readStart()` (validated, clamped to the source), `setStartLimit(source)` (hides presets and random ranges past it), `randomizeStart()`, `randomEachPlay()` |
| `app/unit.js` | `unitWord(source)` / `unitWords(source)` / `UnitWords(source)`: "digit(s)" for digit series, "term(s)" for integer series, used in every message, label and the MusicXML subtitle |
| `app/series-panel.js` | `showSeries(source, params, onParamsChange)`: the panel heading, description, page titles, and a select per source param. `routeParams(source, params)` keeps the valid, non-default params for the route; `paramValue(param, params)` gives one param's value. |
| `app/route.js` | `parseRoute(hash)`, `formatRoute(id, params)`, `playerHref(id, params)` |
| `app/music/controls.js` | The Length row and the Scheme and Sound forms: `initControls({ onChange, onTempoInput, onTempoSettled })`, `setSchemesFor(source, seq)`, `readSettings()` (with `readStart()`), `readOverrides(s)`, `showRows(s)`, voice helpers, `clefSetting()`. Pinned codes are kept per code length, and survive Firefox's form restore on reload. |
| `app/music/chips.js` | The Digits → notes view: `renderChips`, `appendChips`, `removeChips`, `setChipOn`, `scrollChipIntoView`, keyed by logical event index |
| `app/music/tabs.js` | The view tabs (ARIA keyboard pattern), remembered under `sonochrome.music-tab` |
| `app/music/instruments.js` | `INSTRUMENTS`, `GM_PROGRAM`, `instrumentLabel(id)`, and `playNote(ctx, inst, midi, t, d, out, nodes)`: twelve synthesised instruments (Web Audio oscillators, filters, a Karplus–Strong guitar) |
| `app/music/transport.js` | The audio clock: `unlockAudio()` (inside a user gesture), `startAudio(nv, bpm)`, `elapsed()`, `secondsPerBeat()`, `scheduleNotes(voices, sched, instrumentOf)` (1.5 s lookahead), `suspendAudio()`/`resumeAudio()`, `stopAudio()` |
| `app/music/roll.js` | `drawRoll(piece, cur, beatPos, stoppedAt)`: the piano roll, coloured from the CSS theme |
| `app/music/score.js` | `renderScore(piece, clefSetting, atBeat)` (VexFlow), `showScoreMessage`, `setScoreNoteOn`, `scrollScoreTo`, and page tracking for streaming (`pageOf`, `renderedScorePage`, `scoreIsDirty`, `markScoreDirty`, `resetScorePage`). Each stave row fits its notes: a first pass measures how far they reach above and below the staff, and the second gives every row at least that room (minimum 104 px, the prototype's fixed row). Ledger-line notes are never clipped, and rows never overlap. |
| `app/music/download.js` | `updateDownload(piece, playing, playedBeats)`, `collectScore(evs, { sourceName, start, bpm, parts, clefSetting })` (pure, tested), `downloadMusicXML(piece, seq, beatsPlayed, meta)` |
| `app/play.js` | The page entry: follows the route, creates the source's supply, fills the Series panel, runs foreground computes (`page.compute(need)`, with progress and Cancel), and switches views. Each view implements `{ name, computeVerb, setSource(source, supply, probe), refresh(), show(), hide(), status(text) }`. |
| `app/color/view.js` | The Colour view, `createColorView(page)`: rebuilds the image, Compute when pending, the inspector, copy and PNG |
| `app/color/controls.js` | The Colour and Image forms: `initColorControls({ onChange, onFormatChange })`, `readImageSettings()` → `{ mode, order, format, w, h, px }` (clamped: up to 300×300 cells, 200 px), `setModesFor(source, probe)`, `refreshPills()` |
| `app/color/canvas.js` | `drawCells(image, px)` (within the browser's 16,000-pixel canvas limit), `clearCanvas()`, `cellAt(event, image)` |
| `app/color/lists.js` | `showReadout(hit, format)`, `showDigitsUsed(seq, start, end)` (up to 600 symbols), `showColorList(image, format)` (first 40) |
| `app/color/export.js` | `copyColors(image, format)` (all cells, in fill order), `downloadPng(name)` → `<source>-<start>-<mode>-<w>x<h>.png` |
| `app/views.js` | The Music \| Colour tabs: `initViewTabs(onPick)` (ARIA tabs pattern), `showViewParts(name)` |
| `app/music/player.js` | The Music view, `createMusicView(page)`: `refresh()` (only the latest of overlapping refreshes shows its result), play/stop, the 150 ms pump, the per-frame tick, status lines, background refills |

The two modules without DOM access:

**`app/supply.js`**: `createSupply(source, params)` holds the seq a page reads from, and gets more of it.

| Member | What it does |
|---|---|
| `seq` | The longest seq so far, or `null` before the first one. |
| `ready(need)` | Resolves with the seq if it reaches `need`, or prepares it now when `need ≤ quickLength`. Otherwise resolves `null`: the page shows "press Play to compute". |
| `compute(need, report)` | The foreground computation before playback, with `report(p, label)` progress. It stops a running refill. |
| `cancel()` | Stops `compute`, which rejects with an `AbortError`. |
| `refill(target)` | A background computation while playing. It never computes on the page, and runs one at a time and never during `compute`. It resolves `true` when the seq grew. After a failure, refills stay off until `resetRefill()`. |
| `computing`, `refilling`, `refillFailed`, `estimateSeconds(need)`, `stopRefill()` | State and helpers. |

Every request is capped at the source's `maxLength`, and a shorter result never replaces a longer seq.

```js
const supply = createSupply(sourceById('pi'));
const seq = (await supply.ready(5_000)) ?? (await supply.compute(5_000_000, (p, label) => show(p, label)));
```

**`app/music/piece.js`**: the piece being shown and played, as plain data: `{ s, overrides, octs, voices, stream, totalBeats, nextPos }`.
- **Settings:** `s` holds the voice settings plus `count`, `start`, `mode` (`'notes'`, `'time'` or `'infinite'`), `durSec` and `bpm`.
- **Building:**
  - `notesPiece(s, seq, overrides, octs)` builds the whole piece.
  - `streamPiece(…)` starts a stream with an 8-bar preview, and `fillStream(piece, seq, untilBeat)` adds bars while playing. It returns the new events per voice, for appending chips.
  - When the seq runs short, `stream.out` is set; clear it once more symbols arrive.
- **Dropping played events:** `trimPlayed(piece, beat, keepFrom)` drops events that ended more than 64 beats ago. It returns their indices, so their chips can be removed.
  - Indices stay logical: `eventAt(piece, k, i)` finds event `i` of voice `k` even after earlier ones were dropped.
- **Export and history:**
  - `exportEvents(piece, seq, beatsPlayed)` gives the full event lists for MusicXML: the whole piece for Time, the bars played so far for Infinite.
  - `playedRange(piece, beat)` → `{ start, end }` is what a playback used; `symbolSpan(start, evs)` gives the same range for any event lists.
- **Sizing and refills:**
  - `symbolsFor(s, nv)` is the position the seq must reach before playing, and `limitBeats(s)` is the length in beats.
  - `refillTarget(piece, have, ceiling)` returns the position to refill up to when fewer than 300 s of symbols are left (fetching 1200 s more), or `0`.

## Requirements

- **Node 22+:** for `npm test`, and for running wrangler through `npx`. There are no npm dependencies; wrangler is fetched by `npx` at a pinned version (4.166.0).
- **A Cloudflare account:** only to deploy. Run `npx wrangler@4.166.0 login` once.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Runs every `tests/**/*.test.js` with Node's built-in test runner. |
| `npm run dev` | Serves `public/` locally the way Cloudflare does (`wrangler dev`, http://localhost:8787). Any static server also works, since there's no build step. |
| `npm run deploy` | Deploys `public/` to the Cloudflare Worker `sonochrome` (`wrangler deploy`). |

## Deployment

**Live:** https://sonochrome.rbenitez.workers.dev

`wrangler.jsonc` sets up a **Cloudflare Worker with static assets**. It runs no server code; it just serves the files in `public/`:

```jsonc
{ "name": "sonochrome", "compatibility_date": "2026-11-01", "assets": { "directory": "./public" } }
```

- **Deploy:** `npm run deploy` uploads only the changed files and is live within seconds.
- **Deploy on push (optional):** connect the GitHub repo to the Worker in the Cloudflare dashboard (Workers Builds), with no build command.
- **A custom domain** can be added in the dashboard (Workers → sonochrome → Domains).
- **Response headers** (`public/_headers`):
  - `nosniff` and a referrer policy.
  - No long caching, because file names aren't content-hashed; browsers revalidate after each deploy.
- **Keep only site files in `public/`.** `tests/site.test.js` checks that the plans, tests and prototypes stay out of it.
- **Why Workers, not Pages:** Cloudflare is folding Pages into Workers. Wrangler now steers new projects to Workers and recommends them.

## Planned work

See `plans/foundation.md`:
1. Skeleton and first deploy (done)
2. The source interface, with two unlike sources (π and Thue–Morse) (done)
3. The music core as modules, for any source, with output identical to the Pi Notes prototype when fed π (done)
4. The music player page (done)
5. The welcome page and routing (done)
6. The Colour tab (done)
7. Constants (e, √2, φ, ln 2) in any number base (done)
8. Integer series (Nørgård, Recamán, Fibonacci word) (done)

Later: more series, key signatures, MIDI export, a played-range history, and a Rust/Leptos port.

## License

MIT. See `LICENSE`.
