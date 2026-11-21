// Piece 7a: the constant engines (sources/engines.js), BigInt versions, against known digits and against
// simpler, independent algorithms in several bases. (GMP versions are checked in the browser.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENGINES, chudnovsky } from '../public/src/sources/engines.js';
import { machin } from '../public/src/sources/pi.js';

const quiet = () => {};
const BASES = [2, 3, 7, 10, 12, 16];
const N = 2000, GUARD = 12;
// An engine's first N fractional digits (plus the integer part), from a run with guard digits.
const engineDigits = (id, base) => ENGINES[id].bigint(N + GUARD, quiet, base).slice(0, -GUARD);

test('known prefixes in base 10 and 16 (and π in base 2)', () => {
  const known = {
    pi: ['31415926535897932384626433832795028841971693993751', '3243f6a8885a308d313198a2e03707344a4093822299f31d00'],
    e: ['27182818284590452353602874713526624977572470936999', '2b7e151628aed2a6abf7158809cf4f3c762e7160f38b4da56a'],
    sqrt2: ['14142135623730950488016887242096980785696718753769', '16a09e667f3bcc908b2fb1366ea957d3e3adec17512775099d'],
    phi: ['16180339887498948482045868343656381177203091798057', '19e3779b97f4a7c15f39cc0605cedc8341082276bf3a27251f'],
    ln2: ['69314718055994530941723212145817656807550013436025', 'b17217f7d1cf79abc9e3b39803f2f6af40f343267298b62d8a'],
  };
  for (const [id, [dec, hex]] of Object.entries(known)) {
    assert.equal(ENGINES[id].bigint(60, quiet, 10).slice(0, 50), dec, id + ' base 10');
    assert.equal(ENGINES[id].bigint(60, quiet, 16).slice(0, 50), hex, id + ' base 16');
  }
  assert.equal(chudnovsky(60, quiet, 2).slice(0, 50), '11001001000011111101101010100010001000010110100011');
});

test('π base 10 is unchanged: it still matches Machin (and so the prototype)', () => {
  assert.equal(chudnovsky(20_020, quiet).slice(0, 20_000), machin(20_000));
});

// Independent references: ⌊x · base^m⌋ by plain series, in BigInt.
function machinBase(m, base) {
  const one = BigInt(base) ** BigInt(m);
  const acot = (x) => {
    const X = BigInt(x), X2 = X * X;
    let term = one / X, sum = term, k = 1n, sign = -1n;
    while (term > 0n) { term /= X2; k += 2n; sum += sign * (term / k); sign = -sign; }
    return sum;
  };
  return 4n * (4n * acot(5) - acot(239));
}
function taylorE(m, base) {
  const one = BigInt(base) ** BigInt(m);
  let term = one, sum = one;
  for (let k = 1n; term > 0n; k++) { term /= k; sum += term; }
  return sum;
}
// ln 2 = Σ 1/(k·2^k): a different series from the engine's atanh formula.
function seriesLn2(m, base) {
  const one = BigInt(base) ** BigInt(m);
  let sum = 0n, pow = one;
  for (let k = 1n; pow > 0n; k++) { pow /= 2n; sum += pow / k; }
  return sum;
}

for (const [id, reference] of [['pi', machinBase], ['e', taylorE], ['ln2', seriesLn2]]) {
  test(`${id}: ${N} digits agree with an independent series in bases ${BASES.join(', ')}`, () => {
    for (const base of BASES) {
      const ref = reference(N + GUARD, base).toString(base).slice(0, -GUARD);
      assert.equal(engineDigits(id, base), ref, `base ${base}`);
    }
  });
}

test('√2 and φ: the engines return exactly ⌊x · baseⁿ⌋ (checked by squaring)', () => {
  for (const base of BASES) {
    const one = BigInt(base) ** BigInt(N);
    const r = BigInt(parseBig(ENGINES.sqrt2.bigint(N, quiet, base), base));
    assert.ok(r * r <= 2n * one * one && 2n * one * one < (r + 1n) * (r + 1n), `√2 base ${base}`);
    // r = ⌊φ·one⌋  ⇔  (2r − one)² ≤ 5·one² < (2r + 2 − one)²
    const p = BigInt(parseBig(ENGINES.phi.bigint(N, quiet, base), base));
    const lo = 2n * p - one, hi = 2n * p + 2n - one;
    assert.ok(lo * lo <= 5n * one * one && 5n * one * one < hi * hi, `φ base ${base}`);
  }
});

// A digit string in any base → BigInt.
function parseBig(text, base) {
  const B = BigInt(base);
  let v = 0n;
  for (const ch of text) v = v * B + BigInt(parseInt(ch, base));
  return v;
}

test('progress reports stay within 0..1 and never go backwards', () => {
  for (const id of Object.keys(ENGINES)) {
    const seen = [];
    ENGINES[id].bigint(3000, (p) => seen.push(p), 10);
    assert.ok(seen.every((p, i) => p >= 0 && p <= 1 && (i === 0 || p >= seen[i - 1])), id);
  }
});
