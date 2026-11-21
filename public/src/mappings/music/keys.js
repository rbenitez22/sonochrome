/* Key signatures and spelling. The signature comes from the Key (root) and Scale; notes are then spelled
   the way that key writes them: the key's own notes with its letters (G♯ in E major, C♭ in G♭ major),
   other notes as naturals where they can be, else with sharps in a sharp key and flats otherwise.
   With no signature (fifths 0) every note is spelled as midiName always has (flats), so C stays exactly
   as before. Pure: no DOM. */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

// The number of sharps (+) or flats (−) of the major key on each pitch class, C to B. Where a key could
// be written either way, the Key menu's name decides: Db (5 flats), Gb (6 flats), not C♯ or F♯.
const MAJOR_FIFTHS = [0, -5, 2, -3, 4, -1, -6, 1, -4, 3, -2, 5];
// VexFlow's name for the major key with that many sharps or flats.
const KEY_NAMES = { '-7': 'Cb', '-6': 'Gb', '-5': 'Db', '-4': 'Ab', '-3': 'Eb', '-2': 'Bb', '-1': 'F', 0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#' };

// Which major key's signature each scale uses, as an offset from the root, and its MusicXML mode.
const SCALE_KEYS = {
  'Major': [0, 'major'], 'Major pentatonic': [0, 'major'],
  'Natural minor': [3, 'minor'], 'Minor pentatonic': [3, 'minor'], 'Blues': [3, 'minor'],
  'Dorian': [10, 'dorian'],
};

/* The key signature for a root (0 = C … 11 = B) and scale: { fifths, mode, name }. fifths counts sharps
   (+) or flats (−); mode is MusicXML's ('major', 'minor', 'dorian'), or null for a scale without a key
   (Whole tone, Chromatic: no signature). */
export function keySignature(root, scale) {
  const entry = SCALE_KEYS[scale];
  if (!entry) return { fifths: 0, mode: null, name: 'C' };
  const fifths = MAJOR_FIFTHS[(root + entry[0]) % 12];
  return { fifths, mode: entry[1], name: KEY_NAMES[fifths] };
}

// The alteration the signature gives each letter: +1 sharp, −1 flat, 0.
function keyAlters(fifths) {
  const alters = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  if (fifths > 0) for (const l of SHARP_ORDER.slice(0, fifths)) alters[l] = 1;
  if (fifths < 0) for (const l of FLAT_ORDER.slice(0, -fifths)) alters[l] = -1;
  return alters;
}

const mod12 = (n) => ((n % 12) + 12) % 12;

/* A MIDI note spelled in the key with `fifths` sharps or flats: { step, alter, octave }. The octave is
   the letter's: C♭4 is the B below middle C (MIDI 59), B♯3 is middle C (MIDI 60). */
export function spell(midi, fifths = 0) {
  const pc = mod12(midi), alters = keyAlters(fifths);
  let step = LETTERS.find((l) => mod12(NATURAL[l] + alters[l]) === pc), alter;
  if (step) alter = alters[step];
  else if ((step = LETTERS.find((l) => NATURAL[l] === pc))) alter = 0;
  else if (fifths > 0) { step = LETTERS.find((l) => NATURAL[l] === mod12(pc - 1)); alter = 1; }
  else { step = LETTERS.find((l) => NATURAL[l] === mod12(pc + 1)); alter = -1; }
  return { step, alter, octave: Math.floor((midi - alter) / 12) - 1 };
}

const ACCIDENTAL = { 1: '#', 0: '', '-1': 'b' };

// "G#4", "Bb3", "Cb4": a note's name in the key, in the form midiName uses.
export function spelledName(midi, fifths = 0) {
  const { step, alter, octave } = spell(midi, fifths);
  return step + ACCIDENTAL[alter] + octave;
}

// VexFlow's key for a note: "g#/4", "bb/3".
export function vexKey(midi, fifths = 0) {
  const { step, alter, octave } = spell(midi, fifths);
  return step.toLowerCase() + ACCIDENTAL[alter] + '/' + octave;
}
