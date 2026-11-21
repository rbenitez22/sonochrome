// Piece 8b: music schemes and colour modes for integer series.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceById } from '../public/src/sources/index.js';
import { arraySeq } from '../public/src/sources/seq.js';
import { newReader, readEvent, eventSpan } from '../public/src/mappings/music/reader.js';
import { newStream, buildBar } from '../public/src/mappings/music/voices.js';
import { buildCells } from '../public/src/mappings/color/image.js';
import { modeById } from '../public/src/mappings/color/modes.js';
import { formatColor } from '../public/src/mappings/color/convert.js';

const norgard = await sourceById('norgard').prepare({}, 5000);
const recaman = await sourceById('recaman').prepare({}, 5000);
// Major, 2 octaves from C4: 15 positions (0..14), the middle is 7 = C5.
const settings = (scheme) => ({ scheme, codeLen: 4, fixedLen: 0.5, range: 2, root: 0, scale: 'Major', oct: 4 });
const read = (seq, s, n) => { const rd = newReader(s, 0); return Array.from({ length: n }, () => readEvent(s, seq, {}, rd)); };

test('values: Nørgård’s terms are scale steps from the middle (0 = C5)', () => {
  const ev = read(norgard, settings('values'), 8);
  assert.deepEqual(ev.map((e) => e.symbols), ['0', '1', '-1', '2', '1', '0', '-2', '3']);
  assert.deepEqual(ev.map((e) => e.label), ['C5', 'D5', 'B4', 'E5', 'D5', 'C5', 'A4', 'F5']);
  assert.ok(ev.every((e) => eventSpan(e) === 1 && !e.rest && e.beats === 0.5));
});

test('values: large terms wrap around within the range', () => {
  const ev = read(recaman, settings('values'), 2000);
  const lo = 60, hi = 84;  // C4 .. C6, positions 0..14 of Major over two octaves
  assert.ok(ev.every((e) => e.midi >= lo && e.midi <= hi));
  // Recamán's 6th term is 13: 7 + 13 = 20, wrapped into 0..14 is 5 = A4.
  assert.equal(ev[6].symbols, '13');
  assert.equal(ev[6].label, 'A4');
});

test('intervals: each term moves the melody by its difference from the previous one', () => {
  const ev = read(recaman, settings('intervals'), 5);   // 0, 1, 3, 6, 2: moves 0, +1, +2, +3, −4
  assert.deepEqual(ev.map((e) => e.label), ['C5', 'D5', 'F5', 'B5', 'E5']);   // positions 7, 8, 10, 13, 9
});

test('a stream that runs short restores the reader, the previous term included', () => {
  const short = arraySeq(Float64Array.from(recaman.slice(0, 40)), 40);
  const st = newStream({ ...settings('intervals'), start: 0 }, [4, 3]);
  let r;
  while ((r = buildBar(st, short, {})));
  const before = JSON.stringify(st);
  assert.equal(buildBar(st, short, {}), null);
  assert.equal(JSON.stringify(st), before);
  assert.ok(st.voices.every((v) => typeof v.rd.prev === 'number'));
});

test('shade: black for the image’s lowest term, white for its highest', () => {
  for (const seq of [norgard, recaman]) {
    const { cells } = buildCells(seq, 100, 16, 16, modeById('shade'), 'row');
    const greys = cells.map((c) => c.rgb[0]);
    assert.equal(Math.min(...greys), 0);
    assert.equal(Math.max(...greys), 255);
    assert.ok(cells.every((c) => c.rgb[0] === c.rgb[1] && c.rgb[1] === c.rgb[2]));
  }
});

test('wheel: equal values mod 12 share a colour, and the twelve hues differ', () => {
  const { cells } = buildCells(recaman, 0, 32, 32, modeById('wheel'), 'row');
  const byClass = new Map();
  for (const c of cells) {
    const k = ((+c.symbols % 12) + 12) % 12, hex = formatColor(c.rgb, 'hex');
    if (byClass.has(k)) assert.equal(byClass.get(k), hex, `class ${k}`);
    else byClass.set(k, hex);
  }
  assert.equal(new Set(byClass.values()).size, byClass.size);
  assert.equal(formatColor(modeById('wheel').color('-1'), 'hex'), formatColor(modeById('wheel').color('11'), 'hex'));
});
