# Plan: piece 4 — the music player page, at parity with Pi Notes

Part of `plans/foundation.md`. The prototype's UI (`prototypes/pi-notes.html`: markup at lines 162–304, CSS at 10–161, script at 745–1652) becomes `public/play.html` plus modules under `public/src/app/`. These modules sit on the music core from piece 3 and play any source from piece 2. The behaviour and look stay those of Pi Notes, except where a π assumption has to go (listed below).

## Decisions to confirm

1. **Choosing the source before piece 5.** The welcome cards and routing come in piece 5. Until then, `play.html` reads the source from the hash (`play.html#thue-morse`, defaulting to the first source), and the Options card gets a small **Series** select that sets the hash. Piece 5 replaces the select with the welcome page and moves the source settings into their own card.
2. **Two optional fields on the source interface**, so the page needs no π knowledge:
   - **`quickLength`:** how many positions `prepare()` delivers without a noticeable wait (π: 20,000; Thue–Morse: `maxLength`). The page prepares up to this as settings change. Beyond it, the page shows "press Play to compute", as the prototype does past 20k.
   - **`estimateSeconds(upTo)`:** a rough compute time for the "about N sec" hint, taken from the prototype's formula for π. The hint is left out when a source has none.
3. **Wording.** UI text says "digit" and "position" rather than "digit of pi". The source's name fills in where the prototype says π:
   - the masthead, "Start at digit (position 0 is the first)", the "Computing…" progress label and its aria label;
   - the MusicXML title, subtitle and file name (`<source>-<start>-<end>.musicxml`).

   Both current sources are digit series. The `int` series in piece 8 will need "term" wording, and that waits until then.
4. **Limits come from the source.** The start presets, the random-start choices and the refill ceiling use `maxLength`. Presets above it are hidden, so Thue–Morse keeps all of them and π stops at 20M. The prototype's "largest start digit" message uses `maxLength`.
5. **Schemes a source refuses** are disabled in the Scheme select, with `accepts()`' reason as a tooltip. If the current scheme becomes refused, the page switches to the first accepted one.
6. **VexFlow** stays a classic `<script>` from jsDelivr at 4.2.5 (global `Vex`), as in the prototype.

## Modules (one job each)

| Module | Job | From the prototype |
|---|---|---|
| `app/music/piece.js` (pure) | The playing piece: voices with logical event indices (`off`, `dropped`), building in Notes mode, the stream preview and bar filling, dropping played events, the events to export, the played range | `newVoice`, `evAt`, `buildNotesPiece`, `buildStreamPreview`, `fillStream`, `trimPlayed` (minus chip removal), `exportEvents`, `playedRange`, `limitBeats`, `digitsFor` |
| `app/supply.js` | The current source's seq: prepares quickly up to `quickLength`, computes in the foreground with progress and cancel, and refills in the background while playing (shared with the Colour tab later) | `ensureDigits`, `computeDigits`, `maybeRefill`, `REFILL`, `bufferSeconds` |
| `app/music/controls.js` | Reads and validates the form into settings. Also: voice rows, the scheme and length rows, pinned codes kept per code length (the Firefox reload fix), presets, random start | `settings`, `readStart`, `readDuration`, `buildVoiceRows`, `showSchemeRows`, `showLengthRows`, `readOverrides`, pins code |
| `app/music/chips.js` | The Digits → notes view: render and append chips, remove dropped chips, highlight and scroll | `renderChips`, `makeChip`, `appendChips`, chip parts of `setOn`/`tick` |
| `app/music/roll.js` | The piano roll canvas | `draw`, `rollWindow`, `pitchRange` |
| `app/music/score.js` | The VexFlow score: render, page turns while streaming, highlight and scroll | `renderSheet`, `turnSheetPage`, `scrollSheetTo` |
| `app/music/instruments.js` | Synthesised instruments | `INSTRUMENTS`, `GM_PROGRAM`, `ENV`, `playNote`, `ksBuffer`, `getOrgan` |
| `app/music/transport.js` | Audio context and scheduling: start, the 150 ms pump, the clock, stop | `startPlayback`, `pump`, `stop` (audio parts), `beatsPlayed` |
| `app/music/download.js` | The MusicXML button: state, score assembly, saving the file | `updateDownload`, `collectScore`, `digitSpan`, `downloadMusicXML`, `downloadText` |
| `app/music/tabs.js` | The view tabs: ARIA keyboard pattern and the remembered tab | `selectTab`, `onTabShown`, key handling |
| `app/music/player.js` | Wiring: `refresh`, play/stop, `tick`, status lines, resize and theme redraws | `refresh`, `play`, `tick`, `showPlayStatus`, `updateStatus`, listeners |
| `play.html`, `app/music/player.css` | Markup and styles | lines 162–304 and 10–161 |

## Steps (each committed on its own, with a pause for review between them)

**4a. The pure piece and the symbol supply.**
- Add `piece.js`, `supply.js`, and `quickLength`/`estimateSeconds` on both sources.
- **Node tests:**
  - **Piece:** Notes and stream pieces match `buildCountVoices`/`buildBar`. Logical indices survive drops. `dropped` and `playedRange` cover what played.
  - **Export:** `exportEvents` equals the full piece after drops.
  - **Supply:** quick preparation, cancel, and refill rules (no refill past `maxLength`, none while a foreground compute runs). These use a fake slow source.

**4b. The page without sound.**
- Add `play.html`, the CSS, `controls.js`, `tabs.js`, `chips.js` and `player.js` (refresh only).
- Changing any setting rebuilds the chips for Notes, Time and Infinite on both sources. A start past `quickLength` shows the pending message. Play computes with a progress bar and Cancel.
- **Checked in Playwright:** no page errors, the chips match the core's events for the same settings, and the Series select switches sources.

**4c. Sound and playback.**
- Add `instruments.js` and `transport.js`, and the play/stop/tick parts of `player.js`.
- Playback covers highlighting, chip scrolling, status lines, "random each play", background refill and waiting for digits, and stopping at the ceiling.
- **Checked in Playwright** with `--autoplay-policy=no-user-gesture-required`:
  - **Clock:** the status clock advances.
  - **Time mode:** a 0:05 piece stops on its own.
  - **Infinite:** it runs past the preview and drops old chips.
  - **Refill:** with a temporarily lowered `quickLength`, it computes more digits while playing.

**4d. Piano roll, score and MusicXML.**
- Add `roll.js`, `score.js` and `download.js`.
- **Checked in Playwright:** the roll draws, the score renders with highlights and turns pages while streaming, and the tab choice survives a reload.
- **Download:** the file from each mode passes `tests/musicxml-checks.js`, and one renders in MuseScore.

**4e. Parity checklist and wrap-up.**
- Run the foundation plan's checklist in Chromium and Firefox on π and Thue–Morse: Notes/Time/Infinite, refill, MusicXML, and the pinned-code reload fix (Firefox restores form values).
- Compare screenshots side by side with the prototype at the same settings.
- Update the README and the handoff, then ask before deploying.

## Not in this piece

- The welcome page and routing (piece 5), and the Colour tab (piece 6).
- Any new musical behaviour.
