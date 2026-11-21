// Piece 6a: the colour core (mappings/color/*), against the Pi Color Generator prototype.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { sourceById } from '../public/src/sources/index.js';
import { formulaSeq } from '../public/src/sources/seq.js';
import { symbolString } from '../public/src/mappings/music/reader.js';
import { MODES, modeById } from '../public/src/mappings/color/modes.js';
import { cellOrder, ORDERS } from '../public/src/mappings/color/order.js';
import { formatColor, hsl2rgb, rgb2hsl } from '../public/src/mappings/color/convert.js';
import { fitSize, buildCells, symbolsNeeded } from '../public/src/mappings/color/image.js';

// The prototype's colour modes, conversions and fill order, lifted out of its script.
function loadPrototype() {
  const html = readFileSync(new URL('../prototypes/pi-color-generator.html', import.meta.url), 'utf8');
  const code = html.slice(html.indexOf('  // ---------- Color modes ----------'), html.indexOf('  // ---------- UI ----------'));
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${code};this.X={modes,order,fmt,hsl2rgb,rgb2hsl}`, context);
  return context.X;
}
const P = loadPrototype();
const pi = await sourceById('pi').prepare({}, 20_000);
const tm = await sourceById('thue-morse').prepare({}, 20_000);
const PI = symbolString(pi.slice(0, 20_000));
const ORDER_KINDS = ORDERS.map(([k]) => k);

// The prototype's generate() loop, without the DOM.
function prototypeCells(modeId, start, w, h, orderKind) {
  const m = P.modes[modeId], cells = new Array(w * h);
  P.order(w, h, orderKind).forEach(([x, y], i) => {
    const at = start + i * m.dpc, d = PI.substr(at, m.dpc);
    cells[y * w + x] = { start: at, symbols: d, rgb: m.f(d) };
  });
  return JSON.parse(JSON.stringify(cells));
}

test('the modes are the prototype’s, in its order, with its names, hints and digits per cell', () => {
  assert.deepEqual(MODES.map((m) => m.id), Object.keys(P.modes));
  for (const m of MODES) {
    assert.equal(m.name, P.modes[m.id].name);
    assert.equal(m.hint, P.modes[m.id].hint);
    assert.equal(m.dpc, P.modes[m.id].dpc);
  }
  assert.equal(modeById('hsl').dpc, 7);
  assert.equal(modeById('nope'), null);
});

test('on π every mode × order × size × start gives the prototype’s cells', () => {
  let cases = 0;
  for (const m of MODES) for (const orderKind of ORDER_KINDS)
    for (const [w, h] of [[4, 4], [16, 16], [16, 9], [7, 3], [1, 5]]) for (const start of [0, 1, 777]) {
      const { cells, order } = buildCells(pi, start, w, h, m, orderKind);
      assert.deepEqual(cells, prototypeCells(m.id, start, w, h, orderKind), JSON.stringify({ mode: m.id, orderKind, w, h, start }));
      assert.deepEqual(order, JSON.parse(JSON.stringify(P.order(w, h, orderKind))));
      cases++;
    }
  assert.equal(cases, 7 * 4 * 5 * 3);
});

test('every order fills every cell exactly once, even for long thin spirals', () => {
  for (const kind of ORDER_KINDS) for (const [w, h] of [[1, 1], [300, 1], [1, 300], [300, 300], [40, 30], [2, 99]]) {
    const seen = new Set(cellOrder(w, h, kind).map(([x, y]) => {
      assert.ok(x >= 0 && x < w && y >= 0 && y < h);
      return y * w + x;
    }));
    assert.equal(seen.size, w * h, `${kind} ${w}×${h}`);
  }
});

test('the prototype’s spiral matches ours wherever it covered the whole image', () => {
  for (const [w, h] of [[16, 16], [40, 30], [100, 100], [16, 9]]) {
    assert.deepEqual(cellOrder(w, h, 'spiral'), JSON.parse(JSON.stringify(P.order(w, h, 'spiral'))));
  }
  assert.ok(P.order(300, 1, 'spiral').length < 300, 'the prototype left cells out of a 300×1 spiral');
});

test('formatColor and the HSL conversions match the prototype', () => {
  for (const rgb of [[0, 0, 0], [255, 255, 255], [12, 200, 99], [214, 39, 40], [128, 128, 0]]) {
    for (const kind of ['hex', 'rgb', 'hsl', 'dec']) assert.equal(formatColor(rgb, kind), P.fmt(rgb, kind));
    assert.deepEqual(rgb2hsl(...rgb), [...P.rgb2hsl(...rgb)]);
  }
  assert.deepEqual(hsl2rgb(200, 50, 40), [...P.hsl2rgb(200, 50, 40)]);
  assert.equal(formatColor([255, 0, 16], 'hex'), '#ff0010');
  assert.equal(formatColor([1, 2, 3], 'dec'), String(0x010203));
});

test('which modes accept which seqs', () => {
  const accepted = (seq) => MODES.filter((m) => m.accepts(seq) === true).map((m) => m.id);
  assert.deepEqual(accepted(pi), MODES.map((m) => m.id));
  assert.deepEqual(accepted(tm), ['rgb3', 'rgb2', 'gray', 'pal', 'cmyk']);
  assert.deepEqual(accepted({ base: 12 }), ['rgb3', 'rgb2', 'gray', 'cmyk']);
  assert.deepEqual(accepted({ base: null }), []);
  for (const m of MODES) if (m.accepts(tm) !== true) assert.equal(typeof m.accepts(tm), 'string');
});

test('in base 2 the scaled modes span each channel’s full range', () => {
  // Pseudo-random bits, so every n-bit pattern occurs.
  let x = 12345;
  const bits = Array.from({ length: 50_000 }, () => { x = (x * 1103515245 + 12345) >>> 0; return (x >>> 16) & 1; });
  const seq = formulaSeq(bits.length, 2, (i) => bits[i]);
  for (const id of ['rgb3', 'rgb2', 'gray', 'cmyk']) {
    const { cells } = buildCells(seq, 0, 64, 64, modeById(id), 'row');
    for (const c of [0, 1, 2]) {
      const channel = cells.map((cell) => cell.rgb[c]);
      assert.equal(Math.min(...channel), 0, `${id} channel ${c} reaches 0`);
      assert.equal(Math.max(...channel), 255, `${id} channel ${c} reaches 255`);
    }
  }
});

test('on Thue–Morse: RGB 9 uses the levels 1/7 to 6/7 (it never repeats a block three times), the palette two colours', () => {
  const { cells } = buildCells(tm, 0, 64, 64, modeById('rgb3'), 'row');
  const levels = new Set(cells.flatMap((c) => c.rgb));
  assert.deepEqual([...levels].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6].map((k) => Math.round(k / 7 * 255)));
  const pal = buildCells(tm, 0, 8, 1, modeById('pal'), 'row').cells.map((c) => formatColor(c.rgb, 'hex'));
  assert.deepEqual(pal, ['#1b1b1b', '#d62728', '#d62728', '#1b1b1b', '#d62728', '#1b1b1b', '#1b1b1b', '#d62728']);
});

test('fitSize shrinks height first, then width, to fit before the limit', () => {
  assert.deepEqual(fitSize(16, 16, 9, 0, 1e6), { w: 16, h: 16, reduced: false });
  assert.deepEqual(fitSize(16, 16, 9, 0, 1000), { w: 16, h: 6, reduced: true });
  assert.deepEqual(fitSize(300, 300, 9, 999_000, 1_000_000), { w: 111, h: 1, reduced: true });
  const { w, h } = fitSize(100, 100, 7, 19_990_000, 20_000_000);
  assert.ok(symbolsNeeded(19_990_000, w, h, 7) <= 20_000_000);
  assert.equal(symbolsNeeded(10, 4, 4, 9), 10 + 144);
});
