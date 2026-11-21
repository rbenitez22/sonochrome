# Plan: piece 7 — constants and number bases

Part of `plans/foundation.md`. This piece adds four constants beside π: **e, √2, φ and ln 2**. Every constant, π included, gains a **base** param, so `play.html#e?base=12` hears e in base 12, one digit per chromatic step. Thue–Morse stays as it is.

## How a constant becomes digits

Every constant is computed the same way: the integer **⌊x · bⁿ⌋**, written in base b. The integer part comes first, so position 0 is its first digit. π in base 10 is still `31415…`, and ln 2 is `0693…`, since its integer part is 0.

| Constant | Integer method (BigInt on the page and as fallback; GMP in the worker) |
|---|---|
| π | Chudnovsky, as now. The scale `10^(2d)` inside the square root becomes `b^(2n)`, which leaves base 10 unchanged. Base 10 up to 20,000 digits stays on Machin, for the prototype comparison. |
| e | Σ 1/k! by binary splitting: `⌊bⁿ · P/Q⌋`. |
| √2 | `isqrt(2 · b^(2n))` |
| φ | `⌊(bⁿ + isqrt(5 · b^(2n))) / 2⌋` |
| ln 2 | `18·atanh(1/26) − 2·atanh(1/4801) + 8·atanh(1/8749)`, each atanh by binary splitting. (A plain series takes 1.3 s for 100k digits in BigInt, so splitting is needed in the worker.) |

- **Guard digits:** a few extra digits are computed and then cut off, so truncation never changes the digits handed out. π already does this.
- **Timings:** BigInt measured at 20,000 decimal digits: e 5 ms, √2 9 ms, ln 2 53 ms (simple series). So every constant gets `quickLength` 20,000 on the page, the same as π. Beyond that, the digits worker uses GMP.
- **Limits:** `maxLength` is 20,000,000 positions for every constant in every base. A position is a digit in that base, so base 2 is cheaper than base 10.

## Decisions to confirm

1. **Bases offered:** 2, 3, 4, 5, 6, 7, 8, 10, 12 and 16, with 10 as the default.
   - The base is a source **param**, so it lives in the route (`#e?base=12`, the plan from piece 5). It's set by a **Base** select in the Series panel's params slot.
   - Changing the base starts a new supply, since the digits are a different sequence.
2. **Which schemes and colour modes take bases above 10:**
   - **Music:** `degrees` reads one digit as one scale step, so it works in any base. In base 12 with the Chromatic scale that's one digit per semitone.
   - **Music, still base 10 or below:** `pairs` and `steps` index 10-entry tables. `codes` stays base 10 only.
   - **Colour:** the scaled modes (RGB, grey, CMYK) already take any base. The palette (10 colours) and HSL/hex literal keep their limits.
   - **Fix on the way:** schemes read a digit with `+d`, which fails for `a`–`f`. They switch to `parseInt(d, base)`, which gives the same result for base 10.
3. **One constant factory:** `sources/constant.js` builds a source from `{ id, name, glyph, blurb, engines }`. It handles the base param, caching one digit string per base, the on-page path, the worker and the limits. π becomes one of these, while its own engines keep its base-10 output byte for byte.
   - **Order** on the welcome page: π, e, √2, φ, ln 2, Thue–Morse.
4. **Glyphs:** `π`, `e`, `√2`, `φ` and `ln2`.

## Steps (each committed and pushed on its own)

**7a. Engines.**
- Write BigInt and GMP engines for all five constants, taking `(count, base)`. π's Chudnovsky gains the base, with base 10 unchanged.
- **Node tests:**
  - **Known prefixes:** e, √2, φ and ln 2 in base 10 and 16, and π in base 2 and 16 (`3.243F6A88…`).
  - **Independent check:** each engine matches a simple, separate BigInt algorithm for 2,000 digits in bases 2, 3, 7, 10, 12 and 16 (Taylor series, Newton's method, Machin).
  - **π base 10** still matches the prototype.
- **Browser check:** the GMP engines give the same strings as BigInt, up to 300k digits.

**7b. Constant sources and bases.**
- Add `sources/constant.js` and the five constants, with the per-base cache, `ENGINES` in the worker taking `(constant, count, base)`, and the registry.
- Schemes read digits with `parseInt(d, base)`, and `degrees` accepts any base.
- **Tests:** the source interface, prefixes through `prepare`, and the Music and Colour checks, which run on every new source automatically.

**7c. The Base select and wrap-up.**
- Add the Series panel's params slot (a Base select) ↔ `?base=` in the route. The welcome page gets cards for the new constants automatically.
- **Browser checks:**
  - every constant plays and draws;
  - base 12 and 16 work in both views;
  - Back and Forward work across base changes;
  - computing past 20k works in the worker, in Chromium and Firefox.
- Update the README and handoff, then deploy.

## Not in this piece

- **Integer series** (Nørgård, Recamán, the Fibonacci word): piece 8.
- **More base-aware schemes:** `pairs`, `steps` and `codes` for bases above 10 stay a musical question for later.
