# Plan: MIDI export

A **Download MIDI** button beside Download MusicXML saves the piece as a Standard MIDI File (`.mid`). It opens in DAWs, notation programs and MIDI players, which MusicXML doesn't reach.

## What the file contains

- **The same span as MusicXML:** the whole piece for Notes and Time, and the bars played so far for Infinite. Both buttons use `exportEvents`, so the button rules carry over: Infinite needs Play first.
- **Format 1:** one track for tempo and meta data, then one track per voice.
  - **Tempo track:** the title (series and positions, like the MusicXML subtitle), tempo (µs per quarter = 60,000,000 / BPM), time signature 4/4, and the **key signature** from the score's key (fifths and major/minor; Dorian is written as its major key, since MIDI has no Dorian).
  - **Voice tracks:** the track name (the instrument), a program change to the instrument's General MIDI program (`GM_PROGRAM`, the same one MusicXML uses), then each note as note-on/note-off. Rests are just gaps.
- **Timing:** 480 ticks per quarter note. Events sit on the sixteenth grid, so a sixteenth is exactly 120 ticks with no rounding. Each note lasts its full length: notes that cross a barline stay one MIDI note, not tied pieces.
- **Channels:** voice k plays on channel k (0–3), which stays clear of channel 10 (drums).
- **Velocity:** a fixed 80. The player has no dynamics, so there is nothing to vary.
- **File name:** `<source>-<start>-<end>.mid`, matching the MusicXML.

## Decisions to confirm

1. **Format 1, one track per voice, General MIDI programs from the instruments already chosen.** The synth's sound itself (oscillators, the Karplus–Strong guitar) can't go into MIDI, so programs are the nearest equivalent. The table is the one the MusicXML export already uses.
2. **Fixed velocity 80** and no other expression. Making a dynamics setting is a separate idea.
3. **Where the button goes:** beside Download MusicXML in the Sheet music tools, with the same enable rules. Both downloads then live together.
4. **Dorian:** written as its relative major's key signature. MIDI's key signature event knows only major and minor.

## Modules

| Module | Job |
|---|---|
| `mappings/music/midi.js` (new, pure) | `toMidi({ title, bpm, key, tracks: [{ name, program, events }] })` → `Uint8Array`: variable-length quantities, chunks, meta events, note on/off pairs |
| `app/music/download.js` | `downloadMidi(piece, seq, beatsPlayed, meta)`, beside `downloadMusicXML`, sharing the score's events and file naming |
| `app/music/player.js`, `play.html` | The button and its enable state |

## Steps (each committed and pushed on its own)

1. **`midi.js` and its tests.** A small independent SMF reader in the test helpers parses the file back. The tests check:
   - **Header:** format 1, track count, 480 ticks.
   - **Notes:** each voice's notes at the right ticks with the right lengths (beats × 480); note-on/off pairs match; rests leave gaps.
   - **Meta data:** program changes, the tempo value, 4/4, the key signature bytes (E major: 4 sharps; F minor: 4 flats, minor).
   - **Range:** every π and Thue–Morse piece from the music grid round-trips.
2. **The button and the download, then wrap-up.**
   - **Browser test:** the `.mid` downloads for Notes, Time and Infinite, and parses.
   - **Manual check:** one file imported into MuseScore (it reads MIDI) and rendered.
   - **Wrap-up:** README, handoff, deploy.

## Not in this plan

- Dynamics, swing or humanising.
- MIDI input, or playing through a MIDI device (Web MIDI).
- Exporting audio (WAV).
