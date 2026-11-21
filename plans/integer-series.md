# Plan: piece 8 — integer series

Part of `plans/foundation.md`. This piece adds three series that aren't digits of a constant:

| Series | OEIS | Terms | How it's made | Cost |
|---|---|---|---|---|
| **Nørgård's infinity series** | A004718 | Integers, small and signed (−20…20 for the first million) | A formula: a(2n) = −a(n), a(2n+1) = a(n) + 1. From the bits of n, most significant first: start at 0; a 1 bit adds 1, a 0 bit negates. | Instant at any position (1M terms in 31 ms) |
| **Recamán's sequence** | A005132 | Integers ≥ 0 that grow, up to about 5.9 million in the first million terms | From 0: go back n if that lands on a new positive number, otherwise forward n. | Computed from 0, with a bitmap of values visited: 1M terms in 12 ms and 8 MB |
| **Fibonacci word** | A003849 | Binary digits 0/1 | Exact formula: a(n) = 2 + ⌊(n+1)φ⌋ − ⌊(n+2)φ⌋, with ⌊nφ⌋ = ⌊(n + ⌊√5·n⌋) / 2⌋ in BigInt, so it's exact at any position. | Instant |

## Decisions to confirm

1. **The Fibonacci word is a digit series (base 2),** like Thue–Morse. So every binary-capable scheme and colour mode works on it as they are. Only Nørgård and Recamán are `int` series (`kind: 'int'`, `seq.base = null`).
2. **Recamán is computed on the page, capped at 1,000,000 terms** (the foundation plan's open point).
   - **Extending:** the computation keeps going from where it stopped, with no recompute from 0.
   - **No Compute step:** `quickLength = maxLength`, so the user never needs Compute for it.
   - **The cap:** 10M terms would be about 80 MB of bitmap, too much for phones.
3. **Two music schemes for `int` series.** Both use the fixed note length and the Range (octaves) setting. A value outside the range wraps around (mod), so Recamán's large values still land on scale steps.
   - **Value = scale step (centred):** the value counts scale steps from the middle of the range, so 0 is the centre, −2 two steps below. This is Nørgård's own reading.
   - **Differences = melodic steps:** each term moves the melody by its difference from the previous term (Recamán's ±n jumps).
4. **Two colour modes for `int` series:**
   - **Colour wheel · value mod 12:** twelve evenly spaced hues, so equal values share a colour.
   - **Shade · lowest to highest in the image:** grey, scaled between the smallest and largest value in the image. That shows Recamán's growth and Nørgård's shape.
   - The digit modes refuse `int` series, with the reason, as now.
5. **Wording:** an `int` series says **term** instead of **digit**.
   - **Where:** the start label, status lines, range notes, "Digits used" (which becomes "Terms used"), the readout, the progress label, the MusicXML subtitle and the welcome preview.
   - **Showing terms:** they're comma-separated (`0, 1, −1, 2, 1, …`). A chip shows its one term.
6. **Welcome order:** π, e, √2, φ, ln 2, then Thue–Morse, the Fibonacci word, Nørgård and Recamán. Glyphs: `01` (Thue–Morse), `010` (Fibonacci word), `∞` (Nørgård), `R` (Recamán).

## Steps (each committed and pushed on its own)

**8a. The three sources and integer seqs.**
- Add `sources/fibonacci-word.js`, `norgard.js` and `recaman.js`. For `int` seqs, `symbolString` joins values with commas.
- **Tests:**
  - **OEIS prefixes** for all three.
  - **Independent constructions:** the morphism 0→01, 1→0 for the Fibonacci word, the recurrence for Nørgård, and a plain `Set` for Recamán, over 100k terms.
  - **Far positions:** exact Fibonacci-word values near 2⁵⁰, by the formula against the Zeckendorf representation.
  - **Recamán:** extending gives the same terms as computing in one go, and the cap is refused past 1M.
  - **Automatic:** the music and colour checks run on the Fibonacci word.

**8b. Integer schemes and colour modes.**
- Add `values` and `intervals` to `schemes.js`, with a `prev` field on the reader, and `wheel` and `shade` to `modes.js`. `buildCells` passes the image's value range to modes that need it.
- **Tests:**
  - every `int` scheme and mode on Nørgård and Recamán;
  - wrapping into range;
  - the shade spans from 0 to 255 in each image;
  - the digit schemes and modes refuse `int` series with a reason;
  - the music-sources and colour checks cover the new series.

**8c. Wording and wrap-up.**
- Add `unitWord(source)` ("digit" or "term") through both views, the Series panel and the welcome page.
- **Browser checks:** all nine series in both views, in Chromium and Firefox. Also Recamán from position 900,000, past its cap (the image shrinks to fit), and comma-separated previews and chips.
- Screenshots, README, handoff, deploy.

## Not in this piece

- Kolakoski, Stern's diatomic, Collatz, Rule 30 and primes (the foundation plan's "Later").
- Tuning the `int` schemes by ear. The wrapping rule is a first musical guess.
- The base-10 wording in the hints for other bases (the open point from piece 7).
