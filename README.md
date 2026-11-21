# Sonochrome

Music and colour from number series. Pick a series (π, e, the golden ratio, Nørgård's infinity series, Recamán's sequence and others), then **hear** it as a melody with a score, or **see** it as an image. Any long series that never falls into a loop can drive both.

*Sono-* (sound) + *-chrome* (colour). The project was named Chromatone until 2026-11-21.

Sonochrome generalises two single-file prototypes, kept unchanged in `prototypes/`:
- `pi-notes.html`: the digits of π → melody, piano roll and sheet music, with MusicXML download. Copied from pi-notes at commit `a51e4e5`.
- `pi-color-generator.html`: the digits of π → coloured cells.

**Status:** pieces 1–3 of `plans/foundation.md` are done: the skeleton and deploy, the source interface with two sources (π and Thue–Morse), and the music core as pure modules (`plans/music-core.md`). Piece 4, the music player page (`plans/music-player.md`), is under way: step 4a (the piece state and the symbol supply) is done. The site is still a placeholder welcome page.

## Layout

```
public/          the deployed site: only this folder is served
  index.html     welcome page (series cards)
  _headers       response headers for Cloudflare
  src/sources/   one ES module per series, plus the shared seq helpers (see Sources)
  src/workers/   digits.js: module Web Worker that computes constants from position 0
  src/mappings/music/   symbols → notes (pure, no DOM; see Music mappings)
  src/app/       the pages' code: supply.js (symbols for the page), music/ (the player; see Player)
tests/           node --test (no dependencies)
prototypes/      the two original HTML apps, for reference and equivalence tests
plans/           design plans, one per feature
wrangler.jsonc   Cloudflare config
```

Planned under `public/src/` (see `plans/foundation.md`):
- `mappings/color/`: symbols → colours (pure, tested).
- `app/music/`: the player's views and audio, and `app/color/` later.

## Sources

A **source** is one series. Each lives in `public/src/sources/<id>.js` and default-exports:

```js
export default {
  id: 'thue-morse',            // used in URLs and the registry
  name: 'Thue–Morse',
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
- **A seq** is `{ length, base, at(i), slice(i, j) }`.
  - `length` may exceed `upTo`; `base` is the alphabet size of a digit source, or `null` for integer sources.
  - `at(i)` returns a number and throws a `RangeError` outside `0..length-1`.
  - `slice(i, j)` returns an array of numbers and clamps its range like `Array.prototype.slice` (no negative indices).
- **Helpers** in `seq.js`: `digitStringSeq(text, base)` wraps a string of digit characters; `formulaSeq(length, base, term)` wraps a function of the position.
- **Registry** in `sources/index.js`: `SOURCES` (in welcome-page order) and `sourceById(id)`, which returns `null` for an unknown id.

```js
import { sourceById } from './src/sources/index.js';
const seq = await sourceById('pi').prepare({}, 100_000, (p, label) => console.log(p, label));
seq.slice(0, 5); // [3, 1, 4, 1, 5]
```

| Source | Kind | Cost |
|---|---|---|
| `pi` (π) | digit, base 10, up to 20,000,000 | Computed from position 0. Up to 20,000 digits use Machin's formula on the page. Beyond that, the Chudnovsky series runs in `workers/digits.js`, on GMP (gmp-wasm 1.3.2 ESM from jsDelivr) or on BigInt if GMP can't load (Firefox's BigInt stops at about 157k digits). A longer request recomputes from 0, and the longest result is cached. Without Worker support (or in Node) it computes on the calling thread. |
| `thue-morse` | digit, base 2 | A formula (the parity of the 1 bits in n), so any position is instant and `prepare` does nothing. |

**The digits worker** (`workers/digits.js`) takes `{ constant, count }` and replies with `{ p, l }` progress, then `{ done, engine }` or `{ error, engine }`. Sources call it through `computeConstant(constant, count, { inline, report, signal, allowInline })` in `sources/constant-worker.js`. A new constant adds its BigInt and GMP engines to `ENGINES` in the worker.

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
- **Which seqs a scheme reads:** `accepts(seq)` returns `true` or a reason string. `codes` needs base 10, since its rules (`÷9`, `mod 7`) are tuned for decimal. `degrees`, `pairs` and `steps` read any digit series up to base 10 (Thue–Morse included), because they index 10-entry tables. Larger bases and integer series come in pieces 7–8.

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

## Player

`public/src/app/` holds the code behind the pages. Piece 4 builds the music player on it (`plans/music-player.md`); so far it has the two modules without DOM access:

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
4. The music player page
5. The welcome page and routing
6. The Colour tab
7. Constants (e, √2, φ, ln 2) in any number base
8. Integer series (Nørgård, Recamán, Fibonacci word)

Later: more series, key signatures, MIDI export, a played-range history, and a Rust/Leptos port.

## License

MIT. See `LICENSE`.
