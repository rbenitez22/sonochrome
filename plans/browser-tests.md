# Plan: permanent browser tests (done 2026-11-21: 112 tests, `npm run test:browser`)

Every browser check so far ran as a throwaway Playwright script in the session scratchpad. They covered parity with both prototypes, playback, refills, views, routes, constants, integer series, the score and canvas fixes. This plan turns them into a test suite in the repo, run with one command in Chromium and Firefox.

## Decisions to confirm

1. **`@playwright/test` 1.64.1 as a devDependency.** It's the version already installed on this machine, so its Chromium and Firefox builds are reused and nothing new downloads. This is the repo's first npm dependency: `package.json` and `package-lock.json` are committed, `node_modules/` stays ignored, and the README's "no npm dependencies" becomes "one dev dependency, for browser tests only". The site itself still has no build step and no runtime dependencies.
2. **Commands:**
   - `npm test` stays the fast Node unit tests (about 4 s).
   - **`npm run test:browser`** runs the browser suite.
   - `npm run test:browser:quick` skips the slow tests, tagged `@slow`: real-time playback of 5–25 s and the full 72- and 112-setting prototype comparisons.
3. **A tiny static server in the repo** (`tests/browser/serve.mjs`, Node built-ins only), serving the repo root so the tests can open `public/` and `prototypes/` side by side. Playwright starts it as its `webServer` on a free port.
4. **Layout:**
   - The specs live in `tests/browser/*.spec.js`. The `.spec.js` names keep them out of `npm test`'s `*.test.js` glob.
   - **Shared fixture:** `tests/browser/fixtures.js` fails any test whose page throws or logs a console error, as every scratch script checked by hand. It also has the helpers the scripts repeated: set a field and fire its event, and wait for chips or the colour list.
   - **Browsers:** projects for `chromium` and `firefox`. Chromium runs with `--autoplay-policy=no-user-gesture-required` and Firefox with `media.autoplay.default: 0`, so audio starts without a click.
5. **Network:** the pages load VexFlow, gmp-wasm and the fonts from CDNs, so the browser suite needs a connection, as the site does. The tests that need GMP (computing past 20,000 digits) say so in their names.
6. **Running them:** by hand, before deploys. Running them on push (GitHub Actions) is a separate decision for later.

## Specs (one file per area)

| Spec | From the scratch checks |
|---|---|
| `welcome.spec.js` | Nine cards with previews (comma-separated for integers); Hear it / See it open the right series and view (5c, 6d, 7c, 8c) |
| `routes.spec.js` | `#id`, `#id/color`, `?base=`; unknown or missing ids go to the welcome page; Back and Forward across series, views and bases; arrow keys on the view tabs (5a, 6b, 7c) |
| `music-parity.spec.js` @slow | 72 settings: identical chips and status to `prototypes/pi-notes.html`, including the pending state; pinned codes across a Firefox reload (4e) |
| `playback.spec.js` @slow | Notes ends, Time 0:05 stops on time and replays, Infinite drops old chips, random each play, tempo stops, refill status (4c) |
| `refill.spec.js` | Fake slow and failing sources: "waiting for more digits", resuming, "Stopped: no more computed digits" (4c2, 4c3) |
| `music-views.spec.js` | Roll pixels, score notes, clef redraw, highlights, page turns at bar 9, remembered tab, MusicXML downloads in every mode checked with `tests/musicxml-checks.js`; fitted score rows with no note outside the SVG (4d, score fix) |
| `color-parity.spec.js` @slow | 112 settings: identical colour lists, "Digits used" and canvas pixels to `prototypes/pi-color-generator.html`; readout and readout format (6c) |
| `color.spec.js` | Compute past 20k, shrinking to fit, the iOS area cap (3900 × 3900, painted to the corner), PNG download, Thue–Morse mode limits (6c, canvas fix) |
| `series.spec.js` | All nine series in both views; base 12 and 16 (degrees scheme, hex colours); ln 2 in hex from 100k in the worker (needs GMP); "term" wording, Recamán near its cap; hints follow the base (7c, 8c, hints) |

## Steps (each committed and pushed on its own)

1. **Setup:** `package.json` (devDependency, scripts), lockfile, `playwright.config.js`, `serve.mjs`, `fixtures.js`, and `welcome.spec.js` and `routes.spec.js` as the first specs. Then a README section on running the tests.
2. **Music specs:** `music-parity`, `playback`, `refill`, `music-views`.
3. **Colour and series specs:** `color-parity`, `color`, `series`. The full suite then runs green in both browsers, and the handoff records the commands.

## Not in this plan

- CI on push (GitHub Actions) and visual-diff screenshots.
- Real iOS Safari: there's no WebKit here, and Linux WebKit doesn't share iOS's canvas limits.
