# Chromatone

Music and colour from number series. Pick a series (π, e, the golden ratio, Nørgård's infinity series, Recamán's sequence and others), then **hear** it as a melody with a score, or **see** it as an image. Any long series that never falls into a loop can drive both.

Chromatone generalises two single-file prototypes, kept unchanged in `prototypes/`:
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

- **Node 22+:** for `npm test` and for running wrangler through `npx`. There are no npm dependencies; wrangler is fetched by `npx` at a pinned version (4.166.0) when you deploy.
- **A Cloudflare account:** only to deploy. Run `npx wrangler@4.166.0 login` once.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Runs every `tests/**/*.test.js` with Node's built-in test runner. |
| `npm run dev` | Serves `public/` locally the way Cloudflare will (`wrangler dev`, http://localhost:8787). |
| `npm run deploy` | Deploys `public/` to Cloudflare as the Worker `pi-notes` (`wrangler deploy`). The site is served at `https://pi-notes.<your-subdomain>.workers.dev`. |

Any static server also works for development, e.g. `python3 -m http.server -d public`. The pages are plain HTML and ES modules with no build step.

## Deployment

`wrangler.jsonc` sets up a **Cloudflare Worker with static assets**:

```jsonc
{ "name": "pi-notes", "compatibility_date": "2026-11-01", "assets": { "directory": "./public" } }
```

- **Deploy on push:** in the Cloudflare dashboard, connect the GitHub repo (Workers Builds) with no build command. Pushes to `splinter` then deploy automatically.
- **A custom domain** can be added in the dashboard (Workers → pi-notes → Domains).
- **Response headers** (`public/_headers`):
  - `nosniff` and a referrer policy.
  - No long caching, because file names aren't content-hashed; browsers revalidate after each deploy.
- **Keep only site files in `public/`.** `tests/site.test.js` checks that the plans, tests and prototypes stay out of it.

## Planned work

See `plans/foundation.md`:
1. Skeleton and first deploy (this piece)
2. The source interface and π
3. The music core as modules, with output identical to the Pi Notes prototype
4. The music player page
5. The welcome page and routing
6. The Colour tab
7. Constants (e, √2, φ, ln 2) in any number base
8. Integer series (Nørgård, Recamán, Thue–Morse, Fibonacci word)

Later: more series, key signatures, MIDI export, a played-range history, and a Rust/Leptos port.

## License

MIT. See `LICENSE`.
