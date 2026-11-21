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
```

Planned under `public/src/` (see `plans/foundation.md`):
- `sources/`: one module per series. Each gives the symbol at position n.
- `mappings/`: symbols → music events and symbols → colours (pure, tested).
- `app/`: pages, audio and views.

## Requirements

- **Node 22+:** only for `npm test`. There are no npm dependencies.
- **Deploying:** a Cloudflare account with a Pages project named `chromatone`. The optional terminal deploy fetches wrangler through `npx` at a pinned version (4.166.0) and needs `npx wrangler@4.166.0 login` once.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Runs every `tests/**/*.test.js` with Node's built-in test runner. |
| `npm run dev` | Serves `public/` at http://localhost:8000 (Python's built-in server). Any static server works; there's no build step. |
| `npm run deploy` | Optional: uploads `public/` to the Pages project `chromatone` (`wrangler pages deploy`), the same as uploading it in the dashboard. |

## Deployment

The site is deployed to **Cloudflare Pages** the same way as pi-notes: by uploading a folder, with no build step.

- **The folder is `public/`.** In the dashboard: Workers & Pages → the `chromatone` Pages project (create it with "Upload assets" the first time) → new deployment → upload `public/`. The site is served at `https://chromatone.pages.dev`.
- **From the terminal**, `npm run deploy` does the same upload.
- **Deploy on push** is possible later: connect the GitHub repo to the Pages project, with an empty build command and output directory `public`.
- **Response headers** (`public/_headers`, which Pages reads):
  - `nosniff` and a referrer policy.
  - No long caching, because file names aren't content-hashed; browsers revalidate after each deploy.
- **Keep only site files in `public/`.** `tests/site.test.js` checks that the plans, tests and prototypes stay out of it.

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
