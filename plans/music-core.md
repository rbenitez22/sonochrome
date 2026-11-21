# Plan: piece 3 — the music core as modules

Part of `plans/foundation.md`. The `// <pure>` section of `prototypes/pi-notes.html` (lines 307–744, minus the π engines that moved in piece 2) becomes pure ES modules under `public/src/mappings/music/`. They read from any source's **seq** instead of the prototype's `PI` string. The UI comes in piece 4, so nothing here touches the DOM.

## Contract changes from the prototype

These are the only differences in behaviour or shape. Everything else is a straight move.

1. **`seq` replaces `PI`.** Readers call `seq.slice(pos, pos + chunk)` and check `seq.length`. Every function that took `PI` takes `seq` in the same argument position.
2. **`e.digits` becomes `e.symbols`**, a string with one character per symbol (`'0'-'9'`, then `'a'-'z'` for bases up to 36). For base 10 it is identical to the prototype's `digits`, so pinned-code override keys (`"2635"`) keep working unchanged.
3. **Each scheme declares what it accepts:** `accepts(seq)` returns true or a reason string.
   - `codes`: base 10 only, because its rules (`÷9`, `mod 7`) are tuned for decimal.
   - `degrees`, `pairs`, `steps`: any digit source with base ≤ 10, since they index the 10-entry tables `PAIR_LEN` and `STEPS` as now. Bases above 10 and `int` sources come with pieces 7–8.
4. **The MusicXML `<software>` tag** says `Sonochrome` instead of `Pi Notes`. The equivalence test accounts for this one string.
5. **No π-specific limits in the core.** `START_MAX` (20M) disappears: `randomStart(max)` and the start checks take the source's `maxLength`. `streamDigits`/`digitsNeeded` become `streamSymbols`/`symbolsNeeded`.

## Modules (one job each)

| Module | Contents from the prototype |
|---|---|
| `theory.js` | `NAMES`, `SCALES`, `midiName`, `noteToMidi`, `fmtLen`, `quant` |
| `overrides.js` | `parseOverrides` (pinned codes) |
| `schemes.js` | `PAIR_LEN`, `CODE_LEN`, `STEPS`, `chunkSize`, `decodeChunk`, `digitsPerBeat` → `symbolsPerBeat`, plus the scheme list with `id`, `label` and `accepts` |
| `reader.js` | `newReader`, `readEvent` |
| `voices.js` | `buildCountVoices` (Notes mode), `newStream`, `buildBar`, `regenerateVoices` (Time/Infinite) |
| `measures.js` | `decompose`, `toMeasures`, `measuresInRange`, `exportBeats`, `chooseClef` |
| `musicxml.js` | `toMusicXML` and its helpers (`xmlEscape`, `padBars`, `pitchXML`, `noteXML`, …) |
| `timing.js` | `parseDuration`, `fmtTime`, `beatsForSeconds`, `streamSymbols`, `symbolsNeeded`, the duration bounds |
| `../../sources/position.js` | `parseStart`, `randomStart(max, rnd)`: start positions belong to sources, not to music |

## Steps (each committed on its own, with a pause for review between them)

**3a. Theory, schemes and reader.** Add `theory.js`, `overrides.js`, `schemes.js`, `reader.js` and `position.js`, plus `tests/music-equivalence.js`: a helper that loads the prototype's `<pure>` section in a `vm` context (with a π string), so every later test can compare against it.
- **Tests:** `readEvent` matches the prototype event for event, for every scheme × scale × code length on π, from several starts. Unit tests port over for `parseOverrides`, `parseStart`/`randomStart` and `noteToMidi`. `accepts` refuses `codes` on Thue–Morse.

**3b. Voices and streaming.** Add `voices.js` and `timing.js`.
- **Tests:** the pi-notes grid (scheme × scale × 1–4 voices × start × count × range × length) produces identical output to the prototype's `buildCountVoices` and `newStream`/`buildBar`/`regenerateVoices`. The `buildBar` properties port over: resumable, unchanged on a short seq, every note starts where the last ended. `timing.js` unit tests port over too.

**3c. Measures and MusicXML.** Add `measures.js` and `musicxml.js`.
- **Tests:** `toMeasures`, `measuresInRange` and `toMusicXML` match the prototype on the same grid (with the `<software>` tag swapped). The output is checked as well-formed XML, and one file is rendered by MuseScore once by hand.

**3d. No π assumptions.** Rerun the 3b/3c grid on Thue–Morse for every scheme it accepts. There is nothing to compare against, so the checks are that every scheme it accepts produces bars, the totals add up, `e.at` points at `e.symbols`, and the MusicXML is well-formed. Then update the README.

## Not in this piece

- Number base inside the schemes (piece 7) and the `int` schemes (piece 8).
- Any UI, audio or VexFlow code (piece 4).
