# Sonochrome

Music and colour from number series. Pick a series (π, e, the golden ratio, Nørgård's infinity series, Recamán's sequence and others), then **hear** it as a melody with a score, or **see** it as an image. Any long series that never falls into a loop can drive both.

*Sono-* (sound) + *-chrome* (colour). The project was named Chromatone until 2026-11-21.

Sonochrome generalises two single-file prototypes, kept unchanged in `prototypes/`:
- `pi-notes.html`: the digits of π → melody, piano roll and sheet music, with MusicXML download. Copied from pi-notes at commit `a51e4e5`.
- `pi-color-generator.html`: the digits of π → coloured cells.

**Status:** piece 1 of `plans/foundation.md` (skeleton and deploy). The site is a placeholder welcome page; the real series and player come in the next pieces.

## Layout

```
public/          the deployed site: only this folder is served
  index.html     welcome page (series cards)
  _headers       response headers for Cloudflare
tests/           node --test (no dependencies)
prototypes/      the two original HTML apps, for reference and equivalence tests
plans/           design plans, one per feature
wrangler.jsonc   Cloudflare config
```

Planned under `public/src/` (see `plans/foundation.md`):
- `sources/`: one module per series. Each gives the symbol at position n.
- `mappings/`: symbols → music events and symbols → colours (pure, tested).
- `app/`: pages, audio and views.

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
1. Skeleton and first deploy (this piece)
2. The source interface, with two unlike sources (π and Thue–Morse)
3. The music core as modules, for any source, with output identical to the Pi Notes prototype when fed π
4. The music player page
5. The welcome page and routing
6. The Colour tab
7. Constants (e, √2, φ, ln 2) in any number base
8. Integer series (Nørgård, Recamán, Fibonacci word)

Later: more series, key signatures, MIDI export, a played-range history, and a Rust/Leptos port.

## License

MIT. See `LICENSE`.
