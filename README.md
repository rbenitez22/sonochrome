# Sonochrome

Music and colour from number series. Pick a series (π, e, the golden ratio, Nørgård's infinity series, Recamán's sequence and others), then **hear** it as a melody with a score, or **see** it as an image. Any long series that never falls into a loop can drive both.

*Sono-* (sound) + *-chrome* (colour). The project was named Chromatone until 2026-11-21.

Sonochrome generalises two single-file prototypes, kept unchanged in `prototypes/`:
- `pi-notes.html`: the digits of π → melody, piano roll and sheet music, with MusicXML download. Copied from pi-notes at commit `a51e4e5`.
- `pi-color-generator.html`: the digits of π → coloured cells.

**Status:** pieces 1–2 of `plans/foundation.md` are done: the skeleton and deploy, then the source interface with two sources (π and Thue–Morse). The site is still a placeholder welcome page; the music core and player come next.

## Layout

```
public/          the deployed site: only this folder is served
  index.html     welcome page (series cards)
  _headers       response headers for Cloudflare
  src/sources/   one ES module per series, plus the shared seq helpers (see Sources)
  src/workers/   digits.js: module Web Worker that computes constants from position 0
tests/           node --test (no dependencies)
prototypes/      the two original HTML apps, for reference and equivalence tests
plans/           design plans, one per feature
wrangler.jsonc   Cloudflare config
```

Planned under `public/src/` (see `plans/foundation.md`):
- `mappings/`: symbols → music events and symbols → colours (pure, tested).
- `app/`: pages, audio and views.

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
  async prepare(params, upTo, report, options) { return seq },
};
```

- **`prepare(params, upTo, report = () => {}, { signal, allowInline } = {})`** makes positions `[0, upTo)` available and resolves with a **seq**. `report(p, label)` receives progress from 0 to 1.
  - `signal` (an `AbortSignal`) cancels a running computation; the promise rejects with an `AbortError`.
  - `allowInline: false` makes it fail rather than compute on the page when Web Workers are unavailable (for background refills that must not freeze playback).
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

**Adding a source:** write `sources/<id>.js` with the default export above, add it to `SOURCES`, and add tests: a known prefix (OEIS for integer series) plus the shared `slice`/`at` check in `tests/sources.test.js`.

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
3. The music core as modules, for any source, with output identical to the Pi Notes prototype when fed π
4. The music player page
5. The welcome page and routing
6. The Colour tab
7. Constants (e, √2, φ, ln 2) in any number base
8. Integer series (Nørgård, Recamán, Fibonacci word)

Later: more series, key signatures, MIDI export, a played-range history, and a Rust/Leptos port.

## License

MIT. See `LICENSE`.
