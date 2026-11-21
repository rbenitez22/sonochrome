// Source interface: every source's shape, π against the Pi Notes prototype, Thue–Morse against OEIS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SOURCES, sourceById } from '../public/src/sources/index.js';
import { machin, chudnovsky } from '../public/src/sources/pi.js';
import { thueMorse } from '../public/src/sources/thue-morse.js';

// The prototype's own computePi(n), lifted out of prototypes/pi-notes.html.
function prototypeComputePi() {
  const html = readFileSync(new URL('../prototypes/pi-notes.html', import.meta.url), 'utf8');
  const body = /function computePi\(n\) \{[\s\S]*?\n\}/.exec(html)[0];
  return new Function(`${body}; return computePi;`)();
}

const joined = (symbols) => symbols.join('');

test('every source has the interface fields, and ids are unique', () => {
  for (const s of SOURCES) {
    assert.equal(typeof s.id, 'string', s.id);
    assert.equal(typeof s.name, 'string', s.id);
    assert.equal(typeof s.blurb, 'string', s.id);
    assert.ok(['digit', 'int'].includes(s.kind), s.id);
    assert.ok(Array.isArray(s.params), s.id);
    assert.ok(s.maxLength > 0, s.id);
    assert.equal(typeof s.prepare, 'function', s.id);
  }
  assert.equal(new Set(SOURCES.map((s) => s.id)).size, SOURCES.length);
  assert.equal(sourceById('thue-morse').name, 'Thue–Morse');
  assert.equal(sourceById('nope'), null);
});

test('π: the first 20,000 digits match the prototype', async () => {
  const seq = await sourceById('pi').prepare({}, 20_000);
  assert.ok(seq.length >= 20_000);
  assert.equal(seq.base, 10);
  assert.equal(joined(seq.slice(0, 20_000)), prototypeComputePi()(20_000));
});

test('π: Chudnovsky agrees with Machin', () => {
  assert.equal(chudnovsky(20_020, () => {}).slice(0, 20_000), machin(20_000));
});

test('π: past the on-page limit, prepare computes more and keeps the earlier digits', async () => {
  const pi = sourceById('pi');
  const small = await pi.prepare({}, 5_000);
  const big = await pi.prepare({}, 30_000);
  assert.ok(big.length >= 30_000);
  assert.deepEqual(big.slice(0, 5_000), small.slice(0, 5_000));
});

test('π: a request past maxLength is refused', async () => {
  const pi = sourceById('pi');
  await assert.rejects(pi.prepare({}, pi.maxLength + 1), RangeError);
});

test('Thue–Morse: the prefix matches OEIS A010060', async () => {
  const A010060 = '0110100110010110100101100110100110010110011010010110100110010110';
  const seq = await sourceById('thue-morse').prepare({}, 64);
  assert.equal(seq.base, 2);
  assert.equal(joined(seq.slice(0, 64)), A010060);
});

test('Thue–Morse: the formula matches the doubling construction (append the complement)', () => {
  let t = '0';
  while (t.length < 4096) t += [...t].map((c) => (c === '0' ? '1' : '0')).join('');
  for (let i = 0; i < t.length; i++) assert.equal(thueMorse(i), +t[i], `position ${i}`);
});

test('Thue–Morse: far positions are instant', () => {
  assert.equal(thueMorse(2 ** 40), 1);
  assert.equal(thueMorse(2 ** 40 + 1), 0);
  assert.equal(thueMorse(Number.MAX_SAFE_INTEGER), 1); // 53 one bits
});

for (const id of ['pi', 'thue-morse']) {
  test(`${id}: slice and at agree, slice clamps, at refuses positions outside the seq`, async () => {
    const seq = await sourceById(id).prepare({}, 1_000);
    const part = seq.slice(100, 400);
    assert.equal(part.length, 300);
    part.forEach((v, k) => assert.equal(v, seq.at(100 + k)));
    assert.ok(part.every((v) => Number.isInteger(v) && v >= 0 && v < seq.base));
    assert.deepEqual(seq.slice(-5, 3), seq.slice(0, 3));
    assert.deepEqual(seq.slice(10, 5), []);
    assert.throws(() => seq.at(-1), RangeError);
    assert.throws(() => seq.at(seq.length), RangeError);
    assert.throws(() => seq.at(1.5), RangeError);
  });
}
