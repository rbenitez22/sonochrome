# Plan: Chromatone foundation — music and colour from number series

Chromatone generalises two single-file prototypes from `/programming/pi-notes`:

- **Pi Notes** (`index.html`, at commit `a51e4e5`): pi digits → melody. It covers schemes, Notes/Time/Infinite lengths, streaming playback, digit chips, piano roll, a VexFlow score, MusicXML download, and GMP pi up to 20M digits.
- **Pi Color Generator** (`Pi Color Generator.html`): pi digits → coloured cells. It has several colour modes and fill orders.

The goal: a **welcome page** where the user picks a **series**, and then hears it (Music) or sees it (Colour) with the same tools for every series.

## Decisions (confirmed 2026-11-21)

The user chose plain JS modules, Workers static assets and the MIT license. Series-first flow and a fresh history were kept as proposed.


1. **Stack: plain JavaScript ES modules, no build step**, served as static files from Cloudflare (see Deployment). Tests use `node --test`.
   - Why not Leptos now: the working code is JS. VexFlow and gmp-wasm are JS/WASM libraries. Most of the open questions are musical (which series and mappings sound good), and those are faster to answer in JS.
   - The core is kept as **pure modules with no DOM access**, each one the shape of a future Rust module, so the Leptos port stays a straight translation.
   - Alternative: start in Leptos now and call VexFlow and gmp-wasm through JS interop.
2. **Flow: series first, then Music | Colour tabs.** The welcome page lists the series as cards. Picking one opens a single player page (`play.html#pi`), where the source settings, start position and played-range tracking are shared by both tabs.
3. **History: a fresh repo.** The first commit notes where the code came from (pi-notes `a51e4e5`). The alternative is to import pi-notes' history with `git subtree`.
4. **Cloudflare service: Workers with static assets** (`wrangler.jsonc`), named `chromatone` (first planned as `pi-notes`; renamed 2026-11-21 because Chromatone is not about any one series). Pages would need the same folder layout, configured in the dashboard instead.
5. **License:** none in pi-notes today. gmp-wasm is LGPL-3.0 and is loaded unmodified from a CDN, so any license works. MIT is the simple choice, but it's your call.

## Deployment (Cloudflare, Worker name `chromatone`)

The site is entirely static: no server code and no build step. Everything the browser loads lives under `public/`, and nothing else is deployed.

```
chromatone/
  public/                  ← the deployed site (assets directory)
    index.html             welcome page
    play.html              player (Music | Colour tabs)
    src/sources/*.js       ES modules, loaded directly by the browser
    src/mappings/…
    src/app/…
    src/workers/digits.js  Web Worker for constants (module worker, a real file instead of today's Blob)
    _headers               cache rules (long cache for /src/*, short for *.html)
  tests/                   node --test; imports ../public/src/…
  prototypes/              the two original HTML files (reference only)
  plans/
  wrangler.jsonc
  package.json             "type": "module"; scripts: test, dev, deploy
```

- **`wrangler.jsonc`** (Workers with static assets, the setup Cloudflare now recommends for static sites):
  ```jsonc
  { "name": "chromatone", "compatibility_date": "2026-11-01", "assets": { "directory": "./public" } }
  ```
  - **Local preview:** `npx wrangler dev`.
  - **Deploy from your machine:** `npx wrangler deploy`.
  - **Deploy on push:** connect the GitHub repo in the Cloudflare dashboard (Workers Builds) with no build command, so pushes to `splinter` deploy automatically.
  - The site is served at `chromatone.<your-subdomain>.workers.dev`, and a custom domain can be added in the dashboard.
- **Cloudflare Pages also works with the same layout.** Its settings would be: build command empty, output directory `public`, project name `chromatone`. Pick one service; the folder structure doesn't change.
- **Routing:** the player uses the hash (`play.html#pi`), so there's no SPA fallback and no rewrite rules.
- **Third-party code:** VexFlow and gmp-wasm stay on jsDelivr at pinned versions, as in the prototype. Copying them into `public/vendor/` (about 1.3 MB) is an option, so the site keeps working if the CDN is blocked.
- **Wrangler itself:** a dev dependency, so `npm install` is needed only to deploy. `npm test` stays dependency-free.

## Architecture

Three layers. Each layer only knows about the one below it.

```
sources/   a series → symbols at positions 0, 1, 2, …
mappings/  symbols → music events (schemes) | colours (colour modes)
app/       pages, audio, views, downloads (DOM)
```

### Source interface

```js
// sources/<id>.js
export default {
  id: 'pi', name: 'π', blurb: 'The digits of pi.',
  kind: 'digit',                       // 'digit' (0..base-1) or 'int' (unbounded integers)
  params: [{ id: 'base', label: 'Base', choices: [10, 12, 7, 2], default: 10 }],
  maxLength: 20_000_000,               // or Infinity
  // Make positions [0, upTo) available. May be slow (Web Worker); report(0..1) shows progress.
  async prepare(params, upTo, report) { return seq },   // seq: { length, at(i), slice(i, j) }
};
```

- **Random access** (`at(i)`) is what the start position, streaming, `playedRange` and MusicXML regeneration rely on. For digit sources, `seq` wraps a string, as `PI` is today.
- **Cost profiles differ**, and each source states its own:
  - **Formula** (Thue–Morse, Fibonacci word, Nørgård): any position is instant, and `prepare` does nothing.
  - **Computed from 0** (constants, Recamán): `prepare` builds up to `upTo`, the same way pi refills today.
- **Played ranges** gain `{ source, params }`, so the future history store can record "π base 12, 0–4,000 played".

### Mapping compatibility

- Each scheme and colour mode declares which source kinds it accepts.
  - The existing **codes**, **pairs** and **degrees** schemes need `digit` sources.
  - **steps** works on both kinds.
- New schemes for `int` sources:
  - **value → scale degree** (`v mod (scale length × range)`);
  - **value → interval** (difference between consecutive values, folded into range).
- **Number base** enters the digit schemes. For example, "degrees" in base 7 maps one digit to one scale step with no modulo bias.
  - The codes scheme stays base-10 only at first, since its rules (`÷9`, `mod 7`) are tuned for decimal.

## Pieces (each reviewable and committed on its own)

### 1. Skeleton + first deploy
- Add `README.md`, `.gitignore`, the license, `package.json`, `wrangler.jsonc`, `public/_headers`, and the folder layout from Deployment.
- `prototypes/` holds both HTML files unchanged, for reference and comparison tests.
- `public/index.html` starts as a placeholder welcome page. Deploy it once (`npx wrangler deploy`), so the pipeline is proven before any real code moves.

### 2. Source interface + two unlike sources
Nothing in Chromatone is built around one series. This piece proves the interface with two sources of different kinds from the start:
- **π (base 10):** a constant computed from position 0 in a worker. It's needed for the parity tests against the prototype. The prototype's `computePi` / `chudnovsky` / `chudnovskyGmp` / worker code moves behind `prepare()`.
- **Thue–Morse:** a formula series with instant random access and nothing to prepare.
- Generic naming throughout: `seq`, `source`, `symbols`. No `PI` or "digits of pi" outside `sources/pi.js`.
- Tests:
  - the first 20k π digits match the prototype;
  - the Thue–Morse prefix matches OEIS A010060;
  - `slice` and `at` agree for both sources.

### 3. Music core as modules
- The prototype's `<pure>` section becomes `src/mappings/music/*.js`, reading from any source's `seq` instead of the prototype's `PI` string. That covers the schemes, readers, `buildCountVoices`, `newStream`/`buildBar`, measures, `toMusicXML` and `regenerateVoices`.
- Its tests move over. An **equivalence test** feeds the π source and checks that the output is identical to `prototypes/pi-notes.html` for the same settings. A second run on Thue–Morse checks that the core has no π assumptions.

### 4. Music player page, at parity with Pi Notes
- The prototype's UI is split into `src/app/music/*` modules: audio, chips, roll, score, controls and download.
- It works on any source from piece 2. The behaviour stays the same, checked against a short browser checklist: Notes/Time/Infinite, refill, MusicXML, and the pinned-code reload fix.

### 5. Welcome page + routing
- `index.html` shows a card for each source built so far. `play.html#<source>?<params>` opens the player for that source.
- The source settings card (start position, the source's params) moves out of the music controls so the Colour tab can share it.

### 6. Colour tab
- The colour modes go into `src/mappings/color/*.js` (pure, with tests).
- The canvas, fill orders, readout and inspector go into `src/app/color/*`, reading the same `seq` and start position.
- Parity check against the Color Generator prototype.

### 7. Constants and bases
- e, √2, φ and ln 2 are computed with GMP integer arithmetic in the worker (binary splitting or integer square roots).
- The **base** param works for every constant: compute ⌊x·bⁿ⌋ and convert with `mpz_get_str(base)`. That gives, for example, π in base 12, one digit per chromatic note.
- Tests: known digit prefixes for each constant and base.

### 8. Integer series
- Nørgård's infinity series, Recamán and the Fibonacci word (Thue–Morse arrives in piece 2), with the new `int` schemes (value → degree, value → interval).
- Tests: OEIS prefixes (A004718, A005132, A003849).

### 9. Later (not in this plan)
- Kolakoski, Stern's diatomic, Collatz paths, Rule 30 (also as a 2D image), primes, Champernowne and continued fractions.
- Key signatures, MIDI export, the played-range history store, and the Leptos port.

## Open points

- **Recamán is memory-heavy.** It needs a set of every value visited (about 40 MB for 1M terms), so its `maxLength` will be capped (about 1M) until it's measured.
- **Integer series grow:** Nørgård's values stay small, but Recamán's grow with n. The `int` schemes fold values into the chosen range, and choosing that folding is a musical decision to tune by ear.
- **Shared start position.** Should Music and Colour share one start position, or each keep their own? Recommendation: shared, so the image shows the same digits the music plays.
