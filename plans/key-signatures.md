# Plan: key signatures

Today the score is always in C. It shows no key signature, and every black-key note is spelled as a flat (`NAMES`): E major's G♯ shows as A♭, with an accidental each time. The MusicXML says `<fifths>0</fifths>`, and the chips label notes with flats too. This plan gives the score the key signature of the chosen **Key** and **Scale**, and spells notes the way that key does.

## The key signature from Key + Scale

| Scale | Signature | Example (Key = E) |
|---|---|---|
| Major, Major pentatonic | The major key of the root | E major: 4 sharps |
| Natural minor, Minor pentatonic, Blues | The minor key of the root (= the major key 3 semitones up) | E minor: 1 sharp |
| Dorian | The major key 2 semitones below the root | E Dorian: 2 sharps (D major) |
| Whole tone, Chromatic | None (C), as now | |

- **Which way to write ambiguous keys:** a root with two possible signatures uses the one the Key menu already names, which is flats. So Db major is 5 flats (not C♯, 7 sharps), Gb major is 6 flats (not F♯, 6 sharps), and Eb minor is 6 flats.

## Spelling a note in that key

1. **A note of the key's scale** takes the key's letter name: G♯ in E major, C♭ in G♭ major.
2. **Any other note** (a chromatic step, the blues ♭5, a pinned code's note) is spelled with sharps in a sharp key and with flats otherwise, by a sharp or flat on the nearest letter. E blues's ♭5 is A♯ in E minor's 1-sharp signature.
3. **The octave follows the letter:** C♭4 is the B below middle C, and B♯3 is the C of middle C.
4. **In C (no signature), spelling stays exactly as now (flats).** So the Pi Notes comparisons (chips, MusicXML) still hold for every setting in C major, and for scales without a signature.

## Decisions to confirm

1. **Mapping:** the key signature is derived from Key + Scale as in the table above. There's no free key choice separate from them.
2. **A "Key signature" select** beside the Clef in the Sheet music tools: **From the key and scale** (default) or **None (C)**, today's behaviour.
3. **Same spelling everywhere:** the chips, the score and the MusicXML all spell notes the same way. The chips show G♯4 in E major, not A♭4. Event data in the music core doesn't change; only the display and export spell by key.
4. **In the score:** the signature is drawn at the start of every system, after the clef. VexFlow's `applyAccidentals` then adds an accidental only where the key doesn't cover the note (and naturals where needed).
5. **In MusicXML:** `<key><fifths>N</fifths><mode>major|minor</mode></key>`, and each pitch is written with its letter and `<alter>` (+1 or −1). MuseScore and other programs then show the same signature.

## Modules

| Module | Job |
|---|---|
| `mappings/music/keys.js` (new, pure) | `keySignature(root, scale)` → `{ fifths, mode, name }` (name is VexFlow's key, e.g. `'Eb'`), `spell(midi, fifths)` → `{ step, alter, octave }`, `spelledName(midi, fifths)` → `'G#4'` |
| `mappings/music/musicxml.js` | `toMusicXML(score)` takes an optional `score.key = { fifths, mode }`. Without one, its output is unchanged. |
| `app/music/score.js` | Draws the signature and spelled keys; `applyAccidentals` uses the key |
| `app/music/chips.js` | Labels chips with `spelledName` |
| `app/music/controls.js`, `play.html` | The Key signature select |
| `app/music/download.js` | Passes the key to the MusicXML |

## Steps (each committed and pushed on its own)

1. **`keys.js` and its tests.**
   - **The table:** every root × scale gives the signature above.
   - **Diatonic letters:** in every key, the notes of the scale take consecutive letters with no accidental beyond the signature.
   - **Edge cases:** C♭ and B♯ octaves, and C staying flats.
2. **Score, chips and the select.**
   - **Unit tests:** the prototype comparisons still pass (C major).
   - **Browser tests:**
     - **Score:** E major shows a 4-sharp signature (VexFlow's key-signature group), and in-key notes have no accidentals.
     - **None (C):** brings back today's score.
     - **Chips:** they read G♯ in E major.
3. **MusicXML, then wrap-up.**
   - **MusicXML:** it carries the key and spelled pitches (unit and browser tests).
   - **Manual check:** one file rendered in MuseScore.
   - **Wrap-up:** README, handoff, deploy.

## Not in this plan

- Key changes within a piece, and modes beyond the scale menu (Lydian, Mixolydian, …).
- Spelling the blues ♭5 by its function, which would mean flats in a sharp key.
