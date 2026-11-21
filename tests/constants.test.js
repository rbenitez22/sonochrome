// Piece 7b: the constant sources (sources/constant.js and its five constants), with the base param.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOURCES, sourceById } from '../public/src/sources/index.js';
import { BASES, readBase } from '../public/src/sources/constant.js';
import { symbolString } from '../public/src/mappings/music/reader.js';
import { buildCountVoices } from '../public/src/mappings/music/voices.js';
import { SCHEMES } from '../public/src/mappings/music/schemes.js';
import { buildCells } from '../public/src/mappings/color/image.js';
import { modeById } from '../public/src/mappings/color/modes.js';

const CONSTANTS = ['pi', 'e', 'sqrt2', 'phi', 'ln2'];
const first = async (id, n, params = {}) => symbolString((await sourceById(id).prepare(params, n)).slice(0, n));

test('the welcome order: π, e, √2, φ, ln 2, then Thue–Morse', () => {
  assert.deepEqual(SOURCES.map((s) => s.id), [...CONSTANTS, 'thue-morse']);
  for (const id of CONSTANTS) {
    const s = sourceById(id);
    assert.deepEqual(s.params, [{ id: 'base', label: 'Base', choices: BASES, default: 10 }]);
    assert.equal(s.quickLength, 20_000);
    assert.equal(s.maxLength, 20_000_000);
  }
});

test('base 10 and base 16 digits through prepare, integer part first', async () => {
  const known = {
    pi: ['3141592653589793238462643383279502884197169399375', '3243f6a8885a308d313198a2e03707344a4093822299f31d0'],
    e: ['2718281828459045235360287471352662497757247093699', '2b7e151628aed2a6abf7158809cf4f3c762e7160f38b4da56'],
    sqrt2: ['1414213562373095048801688724209698078569671875376', '16a09e667f3bcc908b2fb1366ea957d3e3adec17512775099'],
    phi: ['1618033988749894848204586834365638117720309179805', '19e3779b97f4a7c15f39cc0605cedc8341082276bf3a27251'],
    ln2: ['0693147180559945309417232121458176568075500134360', '0b17217f7d1cf79abc9e3b39803f2f6af40f343267298b62d'],
  };
  for (const [id, [dec, hex]] of Object.entries(known)) {
    assert.equal(await first(id, 49), dec, id + ' base 10');
    assert.equal(await first(id, 49, { base: '16' }), hex, id + ' base 16');
  }
  assert.equal(await first('pi', 30, { base: '2' }), '110010010000111111011010101000');
});

test('the base param picks the base; one cache per base; unknown bases mean 10', async () => {
  assert.equal(readBase({ base: '12' }), 12);
  for (const bad of [undefined, {}, { base: '11' }, { base: 'x' }, { base: '1' }]) assert.equal(readBase(bad), 10);
  const e = sourceById('e');
  const b12 = await e.prepare({ base: '12' }, 3000), b10 = await e.prepare({}, 3000);
  assert.equal(b12.base, 12);
  assert.equal(b10.base, 10);
  assert.notEqual(symbolString(b12.slice(0, 40)), symbolString(b10.slice(0, 40)));
  assert.equal((await e.prepare({ base: '11' }, 10)).base, 10);
  assert.ok(b12.slice(0, 3000).every((v) => v >= 0 && v < 12));
});

test('a long request recomputes and keeps the earlier digits; past maxLength is refused', async () => {
  const phi = sourceById('phi');
  const short = await phi.prepare({ base: '7' }, 500), long = await phi.prepare({ base: '7' }, 25_000);
  assert.ok(long.length >= 25_000);
  assert.deepEqual(long.slice(0, 500), short.slice(0, 500));
  await assert.rejects(phi.prepare({}, 20_000_001), RangeError);
});

test('background requests never compute on the page (Node has no worker, so they are refused)', async () => {
  for (const id of CONSTANTS) {
    await assert.rejects(sourceById(id).prepare({ base: '5' }, 100, () => {}, { allowInline: false }), /background tasks are not available/, id);
  }
});

test('music above base 10: degrees maps each base-12 digit to one semitone of the chromatic scale', async () => {
  const seq = await sourceById('e').prepare({ base: '12' }, 2000);
  assert.deepEqual(SCHEMES.filter((sc) => sc.accepts(seq) === true).map((sc) => sc.id), ['degrees']);
  const s = { scheme: 'degrees', codeLen: 4, fixedLen: 1, range: 1, root: 0, scale: 'Chromatic', count: 48, start: 0 };
  const { voices } = buildCountVoices(s, seq, {}, [4]);
  voices[0].events.forEach((ev, i) => assert.equal(ev.midi, 60 + parseInt(ev.symbols, 12), `event ${i}`));
  assert.ok(new Set(voices[0].events.map((ev) => ev.midi)).size > 8, 'uses most of the twelve semitones');
});

test('colour above base 10: the scaled modes read base-16 digits', async () => {
  const seq = await sourceById('pi').prepare({ base: '16' }, 3000);
  const { cells } = buildCells(seq, 0, 4, 4, modeById('rgb2'), 'row');
  // π in hex starts 3243f6…: the first cell reads 32, 43, f6 → scaled by 255/255.
  assert.deepEqual(cells[0].rgb, [0x32, 0x43, 0xf6]);
  assert.equal(modeById('pal').accepts(seq), 'needs a digit series in base 10 or lower');
});
