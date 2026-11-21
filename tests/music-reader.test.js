// Piece 3a: theory, pinned codes, schemes and the reader, against the Pi Notes prototype.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prototype, PI, piSeq, thueMorseSeq, OVERRIDES_TEXT, SCHEME_CASES, clean, renameDigits } from './music-equivalence.js';
import { SCALES, noteToMidi, midiName, fmtLen, quant } from '../public/src/mappings/music/theory.js';
import { parseOverrides } from '../public/src/mappings/music/overrides.js';
import { SCHEMES, symbolsPerBeat } from '../public/src/mappings/music/schemes.js';
import { newReader, readEvent, symbolString } from '../public/src/mappings/music/reader.js';
import { parseStart, randomStart } from '../public/src/sources/position.js';

test('the π seq and the prototype read the same digits', () => {
  assert.equal(symbolString(piSeq.slice(0, PI.length)), PI);
});

test('readEvent matches the prototype event for event, to the end of the digits', () => {
  let events = 0;
  for (const [scheme, codeLen] of SCHEME_CASES) {
    const overrides = parseOverrides(OVERRIDES_TEXT, codeLen).map;
    assert.deepEqual(overrides, clean(prototype.parseOverrides(OVERRIDES_TEXT, codeLen).map));
    for (const scale of Object.keys(SCALES)) for (const range of [1, 3]) for (const fixedLen of [0.5, 2])
      for (const start of [0, 1, 777, 19_000, 19_990]) {
        const s = { scheme, codeLen, fixedLen, range, root: start % 12, scale, oct: 3 };
        const ours = newReader(s, start), theirs = prototype.newReader(s, start);
        assert.deepEqual(ours, clean(theirs));
        for (let k = 0; k < 300; k++) {
          const e = readEvent(s, piSeq, overrides, ours);
          const p = prototype.readEvent(s, PI, overrides, theirs);
          assert.deepEqual(e, clean(renameDigits(p)), JSON.stringify({ s, start, k }));
          assert.deepEqual(ours, clean(theirs));
          if (!e) break;
          events++;
        }
      }
  }
  assert.ok(events > 100_000, `${events} events compared`);
});

test('each event’s position and symbols point back into the seq', () => {
  const s = { scheme: 'codes', codeLen: 4, fixedLen: 1, range: 2, root: 0, scale: 'Major', oct: 3 };
  const rd = newReader(s, 123);
  for (let k = 0; k < 500; k++) {
    const e = readEvent(s, piSeq, {}, rd);
    assert.equal(symbolString(piSeq.slice(e.at, e.at + e.symbols.length)), e.symbols);
  }
});

test('schemes declare which seqs they accept', () => {
  const accepts = (seq) => Object.fromEntries(SCHEMES.map((sc) => [sc.id, sc.accepts(seq)]));
  assert.deepEqual(accepts(piSeq), { codes: true, degrees: true, pairs: true, steps: true });
  const tm = accepts(thueMorseSeq);
  assert.equal(typeof tm.codes, 'string');
  assert.deepEqual({ ...tm, codes: true }, { codes: true, degrees: true, pairs: true, steps: true });
  const base12 = { base: 12 }, ints = { base: null };
  for (const sc of SCHEMES) {
    assert.equal(typeof sc.accepts(ints), 'string', sc.id);
    if (sc.id === 'degrees') assert.equal(sc.accepts(base12), true, 'degrees reads any digit base');
    else assert.equal(typeof sc.accepts(base12), 'string', sc.id);
  }
});

test('symbolsPerBeat matches the prototype’s digitsPerBeat', () => {
  for (const [scheme, codeLen] of SCHEME_CASES) for (const fixedLen of [0.25, 0.5, 2]) {
    const s = { scheme, codeLen, fixedLen };
    assert.equal(symbolsPerBeat(s), prototype.digitsPerBeat(s));
  }
});

test('readEvent on Thue–Morse reads only 0s and 1s and stops at the end of a short seq', () => {
  const s = { scheme: 'steps', codeLen: 4, fixedLen: 1, range: 2, root: 0, scale: 'Major', oct: 3 };
  const rd = newReader(s, 0);
  for (let k = 0; k < 64; k++) assert.match(readEvent(s, thueMorseSeq, {}, rd).symbols, /^[01]$/);
  const short = { length: 3, base: 2, slice: (i, j) => thueMorseSeq.slice(i, Math.min(j, 3)) };
  const pairs = { ...s, scheme: 'pairs' }, r2 = newReader(pairs, 0);
  assert.ok(readEvent(pairs, short, {}, r2));
  assert.equal(readEvent(pairs, short, {}, r2), null);
  assert.equal(r2.pos, 2, 'a failed read leaves the reader where it was');
});

test('note names and lengths', () => {
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('bb3'), 58);
  assert.equal(noteToMidi('F#5'), 78);
  assert.equal(noteToMidi('H2'), null);
  assert.equal(midiName(70), 'Bb4');
  assert.equal(fmtLen(1.5), '3/8');
  assert.equal(quant(0.1), 0.25);
  for (const n of ['C4', 'Db2', 'B-1', 'A#7']) assert.equal(noteToMidi(n), prototype.noteToMidi(n), n);
});

test('parseOverrides reports bad lines and keeps good ones', () => {
  const { map, errors } = parseOverrides('2635 = Bb3 1/4\n12 = C4\nnonsense\n1111 = H4\n2222 = rest 9\n\n3333 = rest', 4);
  assert.deepEqual(Object.keys(map), ['2635', '3333']);
  assert.deepEqual(map['2635'], { rest: false, midi: 58, beats: 1 });
  assert.equal(errors.length, 4);
});

test('parseStart and randomStart', () => {
  assert.equal(parseStart('20M'), 2e7);
  assert.equal(parseStart('250k'), 250_000);
  assert.equal(parseStart('4,000,000'), 4e6);
  assert.equal(parseStart('1.5k'), 1500);
  assert.equal(parseStart('abc'), null);
  for (const t of ['20M', '250k', '4,000,000', '1.5k', 'abc', '']) assert.equal(parseStart(t), prototype.parseStart(t), t);
  assert.equal(randomStart(1e6, () => 0), 0);
  assert.equal(randomStart(1e6, () => 0.9999999999), 1e6);
  for (let i = 0; i < 1e4; i++) { const v = randomStart(20_000); assert.ok(Number.isInteger(v) && v >= 0 && v <= 20_000); }
});
