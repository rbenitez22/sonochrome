// MIDI export (mappings/music/midi.js), read back with an independent reader (tests/midi-reader.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMidi, vlq, TICKS_PER_QUARTER } from '../public/src/mappings/music/midi.js';
import { readMidi, notesOf } from './midi-reader.js';
import { piSeq, thueMorseSeq, SCHEME_CASES } from './music-equivalence.js';
import { buildCountVoices, regenerateVoices } from '../public/src/mappings/music/voices.js';
import { keySignature } from '../public/src/mappings/music/keys.js';

const metaOf = (track, type) => track.find((e) => e.meta === type)?.data;
const PROGRAMS = [1, 33, 15, 49];

function midiFor(voices, extra = {}) {
  return toMidi({ title: 'π: digits 0–95', bpm: 110, ...extra,
    tracks: voices.map((events, k) => ({ name: 'Voice ' + (k + 1), program: PROGRAMS[k], events })) });
}

test('variable-length quantities, as in the MIDI specification', () => {
  assert.deepEqual(vlq(0), [0x00]);
  assert.deepEqual(vlq(0x7f), [0x7f]);
  assert.deepEqual(vlq(0x80), [0x81, 0x00]);
  assert.deepEqual(vlq(0x2000), [0xc0, 0x00]);
  assert.deepEqual(vlq(0x3fff), [0xff, 0x7f]);
  assert.deepEqual(vlq(0x200000), [0x81, 0x80, 0x80, 0x00]);
  assert.deepEqual(vlq(0x0fffffff), [0xff, 0xff, 0xff, 0x7f]);
});

test('header, tempo track and voice tracks', () => {
  const s = { scheme: 'codes', codeLen: 4, fixedLen: 1, range: 2, root: 0, scale: 'Major', count: 24, start: 0 };
  const { voices } = buildCountVoices(s, piSeq, {}, [3, 2]);
  const file = readMidi(midiFor(voices.map((v) => v.events)));
  assert.equal(file.format, 1);
  assert.equal(file.division, TICKS_PER_QUARTER);
  assert.equal(file.tracks.length, 3);
  const [t0, v1, v2] = file.tracks;
  assert.equal(new TextDecoder().decode(Uint8Array.from(metaOf(t0, 0x03))), 'π: digits 0–95');
  assert.deepEqual(metaOf(t0, 0x51), [0x08, 0x52, 0xaf]);   // 545,455 = 0x0852AF µs a quarter at 110 BPM
  assert.deepEqual(metaOf(t0, 0x58), [4, 2, 24, 8]);
  assert.deepEqual(metaOf(t0, 0x59), [0, 0]);               // no key given: C major
  for (const [track, k] of [[v1, 0], [v2, 1]]) {
    assert.equal(new TextDecoder().decode(Uint8Array.from(metaOf(track, 0x03))), 'Voice ' + (k + 1));
    const pc = track.find((e) => e.kind === 0xc0);
    assert.deepEqual([pc.channel, pc.a], [k, PROGRAMS[k] - 1]);
    assert.ok(track.filter((e) => e.kind === 0x90 || e.kind === 0x80).every((e) => e.channel === k));
    assert.equal(track.at(-1).meta, 0x2f);
  }
});

test('key signatures: E major is 4 sharps, F minor 4 flats and minor, Dorian its major key', () => {
  const keyBytes = (key) => metaOf(readMidi(midiFor([[]], { key })).tracks[0], 0x59);
  assert.deepEqual(keyBytes(keySignature(4, 'Major')), [4, 0]);
  assert.deepEqual(keyBytes(keySignature(5, 'Natural minor')), [0xfc, 1]);   // −4 as a signed byte
  assert.deepEqual(keyBytes(keySignature(4, 'Dorian')), [2, 0]);            // E Dorian: D major's 2 sharps
});

test('every note lands at its beat and lasts its length; rests are gaps (π and Thue–Morse, the music grid)', () => {
  let files = 0;
  for (const [seq, name] of [[piSeq, 'π'], [thueMorseSeq, 'Thue–Morse']]) {
    for (const [scheme, codeLen] of SCHEME_CASES) {
      if (name === 'Thue–Morse' && scheme === 'codes') continue;
      for (const nv of [1, 3]) for (const start of [0, 777]) {
        const s = { scheme, codeLen, fixedLen: 0.5, range: 2, root: 7, scale: 'Dorian', count: 40, start, mode: 'time' };
        const evs = regenerateVoices(s, seq, {}, [4, 3, 2].slice(0, nv), 30.5);
        const file = readMidi(midiFor(evs));
        evs.forEach((events, k) => {
          const expected = events.filter((e) => !e.rest).map((e) => ({ start: e.startBeat * 480, length: e.beats * 480, note: e.midi }));
          assert.deepEqual(notesOf(file.tracks[k + 1]), expected, `${name} ${scheme}${codeLen} nv ${nv} start ${start} voice ${k}`);
        });
        files++;
      }
    }
  }
  assert.equal(files, 4 * 6 + 4 * 3);   // Thue–Morse has no codes (base 10 only)
});

test('more than nine voices is refused (channel 10 is for drums)', () => {
  assert.throws(() => midiFor(Array.from({ length: 10 }, () => [])), RangeError);
});
