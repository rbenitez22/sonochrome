// Note names, scales and note lengths: the music theory every scheme and view shares.

export const NAMES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

// Scale name → semitones above the root.
export const SCALES = {
  'Major': [0,2,4,5,7,9,11],
  'Natural minor': [0,2,3,5,7,8,10],
  'Dorian': [0,2,3,5,7,9,10],
  'Major pentatonic': [0,2,4,7,9],
  'Minor pentatonic': [0,3,5,7,10],
  'Blues': [0,3,5,6,7,10],
  'Whole tone': [0,2,4,6,8,10],
  'Chromatic': [0,1,2,3,4,5,6,7,8,9,10,11]
};

// MIDI number → name with octave, spelled with flats: 60 → "C4", 70 → "Bb4".
export function midiName(m) { return NAMES[m % 12] + (Math.floor(m / 12) - 1); }

// "C4", "bb3", "F#5" → MIDI number, or null when it is not a note.
export function noteToMidi(s) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(s);
  if (!m) return null;
  const base = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }[m[1].toUpperCase()];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (parseInt(m[3], 10) + 1) + base + acc;
}

// Length in beats → note value label: 1 → "1/4", 1.5 → "3/8".
export function fmtLen(b) {
  const map = { 0.25:'1/16', 0.5:'1/8', 1:'1/4', 1.5:'3/8', 2:'1/2', 3:'3/4', 4:'1' };
  return map[b] || (b / 4).toFixed(2);
}

// Lengths are kept on a sixteenth-note grid so the score and the sound agree.
export function quant(b) { return Math.max(0.25, Math.round(b * 4) / 4); }
