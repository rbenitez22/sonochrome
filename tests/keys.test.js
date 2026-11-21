// Key signatures and spelling (mappings/music/keys.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keySignature, spell, spelledName, vexKey } from '../public/src/mappings/music/keys.js';
import { NAMES, SCALES, midiName } from '../public/src/mappings/music/theory.js';

const E = 4;

test('the signature follows the key and the scale', () => {
  const sig = (root, scale) => keySignature(root, scale).fifths;
  assert.deepEqual(Object.keys(SCALES).map((sc) => [sc, sig(E, sc)]), [
    ['Major', 4], ['Natural minor', 1], ['Dorian', 2], ['Major pentatonic', 4],
    ['Minor pentatonic', 1], ['Blues', 1], ['Whole tone', 0], ['Chromatic', 0],
  ]);
  assert.deepEqual(keySignature(1, 'Major'), { fifths: -5, mode: 'major', name: 'Db' });
  assert.deepEqual(keySignature(6, 'Major'), { fifths: -6, mode: 'major', name: 'Gb' });
  assert.deepEqual(keySignature(3, 'Natural minor'), { fifths: -6, mode: 'minor', name: 'Gb' });   // Eb minor
  assert.deepEqual(keySignature(9, 'Natural minor'), { fifths: 0, mode: 'minor', name: 'C' });     // A minor
  assert.deepEqual(keySignature(2, 'Dorian'), { fifths: 0, mode: 'dorian', name: 'C' });           // D Dorian
  assert.deepEqual(keySignature(E, 'Chromatic'), { fifths: 0, mode: null, name: 'C' });
  // Every major key from 6 flats to 5 sharps, once each.
  assert.deepEqual([...Array(12).keys()].map((r) => keySignature(r, 'Major').fifths).sort((a, b) => a - b), [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
});

test('in every key, a seven-note scale takes seven letters, each altered only by the signature', () => {
  for (const scale of ['Major', 'Natural minor', 'Dorian']) for (let root = 0; root < 12; root++) {
    const { fifths } = keySignature(root, scale);
    const notes = SCALES[scale].map((s) => spell(60 + root + s, fifths));
    assert.equal(new Set(notes.map((n) => n.step)).size, 7, `${NAMES[root]} ${scale}: ${notes.map((n) => n.step + n.alter).join(' ')}`);
    const fromSignature = spell(60 + root, fifths);   // the tonic is in the key
    assert.ok(Number.isInteger(fromSignature.alter));
    for (const n of notes) {
      // No accidental beyond the signature: the same letter in the key's own scale has the same alter.
      const tonicMajor = (root + { Major: 0, 'Natural minor': 3, Dorian: 10 }[scale]) % 12;
      const keyNotes = SCALES.Major.map((s) => spell(60 + tonicMajor + s, fifths));
      assert.equal(keyNotes.find((k) => k.step === n.step).alter, n.alter, `${NAMES[root]} ${scale}: ${n.step}`);
    }
  }
});

test('pentatonic and blues notes in the key use the key’s letters; others take sharps or flats by the key', () => {
  assert.deepEqual(SCALES['Major pentatonic'].map((s) => spelledName(64 + s, 4)), ['E4', 'F#4', 'G#4', 'B4', 'C#5']);
  assert.deepEqual(SCALES.Blues.map((s) => spelledName(64 + s, 1)), ['E4', 'G4', 'A4', 'A#4', 'B4', 'D5']);   // E blues: ♭5 is A♯
  assert.equal(spelledName(66, -1), 'Gb4');   // F major: an out-of-key black key is a flat
  assert.equal(spelledName(60, 2), 'C4');     // D major: an out-of-key white key stays natural
  assert.equal(spelledName(70, 3), 'A#4');    // A major: an out-of-key black key is a sharp
});

test('with no signature, spelling is exactly midiName’s (flats), so C is unchanged', () => {
  for (let m = 12; m < 120; m++) assert.equal(spelledName(m, 0), midiName(m), `MIDI ${m}`);
});

test('the octave follows the letter: C♭4 is MIDI 59, B♯3 is MIDI 60', () => {
  assert.deepEqual(spell(59, -6), { step: 'C', alter: -1, octave: 4 });
  assert.equal(spelledName(59, -6), 'Cb4');
  assert.deepEqual(spell(60, 7), { step: 'B', alter: 1, octave: 3 });
  assert.equal(vexKey(59, -6), 'cb/4');
  assert.equal(vexKey(68, 4), 'g#/4');
  assert.equal(vexKey(70, 0), 'bb/4');
});
