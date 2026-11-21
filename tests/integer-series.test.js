// Piece 8a: the Fibonacci word, Nørgård's infinity series and Recamán's sequence, against OEIS and against
// independent constructions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fibonacciWordSource, { fibonacciWord } from '../public/src/sources/fibonacci-word.js';
import norgardSource, { norgard } from '../public/src/sources/norgard.js';
import recaman from '../public/src/sources/recaman.js';
import { symbolString } from '../public/src/mappings/music/reader.js';

const N = 100_000;

test('OEIS prefixes: A003849, A004718, A005132', async () => {
  const A003849 = [0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0];
  const A004718 = [0,1,-1,2,1,0,-2,3,-1,2,0,1,2,-1,-3,4,1,0,-2,3,0,1,-1,2,-2,3,1,0,3,-2,-4,5];
  const A005132 = [0,1,3,6,2,7,13,20,12,21,11,22,10,23,9,24,8,25,43,62,42,63,41,18,42,17,43,16,44,15,45,14,46,79,113,78,114,77,39,78,38,79,37,80,36,81,35,82,34,83];
  assert.deepEqual((await fibonacciWordSource.prepare({}, 32)).slice(0, 32), A003849);
  assert.deepEqual((await norgardSource.prepare({}, 32)).slice(0, 32), A004718);
  assert.deepEqual((await recaman.prepare({}, A005132.length)).slice(0, A005132.length), A005132);
});

test('the Fibonacci word matches the morphism 0 → 01, 1 → 0', () => {
  let w = '0';
  while (w.length < N) w = [...w].map((c) => (c === '0' ? '01' : '0')).join('');
  for (let n = 0; n < N; n++) assert.equal(fibonacciWord(n), +w[n], `position ${n}`);
});

test('the Fibonacci word is exact far out: 1 exactly where the Zeckendorf representation ends in 1', () => {
  // Fibonacci numbers 1, 2, 3, 5, … for Zeckendorf representations.
  const fib = [1, 2];
  while (fib.at(-1) < 2 ** 53) fib.push(fib.at(-1) + fib.at(-2));
  const endsInOne = (n) => {
    let last = 0;
    for (let i = fib.length - 1; i >= 0; i--) if (fib[i] <= n) { n -= fib[i]; last = i; }
    return last === 0 ? 1 : 0;
  };
  for (const n of [0, 1, 4, 6, 12, 39_999_999, 40_000_000, 40_000_001, 2 ** 40 + 7, 2 ** 50 + 123_456_789, 2 ** 52 + 1]) {
    for (let k = 0; k < 20; k++) assert.equal(fibonacciWord(n + k), n + k === 0 ? 0 : endsInOne(n + k), `position ${n + k}`);
  }
});

test('Nørgård matches its recurrence a(2n) = −a(n), a(2n+1) = a(n) + 1', () => {
  const a = [0];
  for (let n = 1; n < N; n++) a[n] = n % 2 === 0 ? 0 - a[n / 2] : a[(n - 1) / 2] + 1;
  for (let n = 0; n < N; n++) assert.equal(norgard(n), a[n], `position ${n}`);
  assert.equal(norgard(2 ** 52 - 1), 52, 'all ones: 52 increments');
});

test('Recamán matches a plain Set construction, extending gives the same terms, the cap is refused', async () => {
  const seen = new Set([0]), a = [0];
  for (let n = 1; n < N; n++) {
    const back = a[n - 1] - n;
    a[n] = back > 0 && !seen.has(back) ? back : a[n - 1] + n;
    seen.add(a[n]);
  }
  const short = await recaman.prepare({}, 1000);
  const long = await recaman.prepare({}, N);
  assert.deepEqual(long.slice(0, N), a, 'extended in two steps');
  assert.deepEqual(short.slice(0, 1000), a.slice(0, 1000), 'the earlier seq stays valid');
  assert.equal(long.base, null);
  assert.ok((await recaman.prepare({}, 1_000_000)).length >= 1_000_000);
  await assert.rejects(recaman.prepare({}, 1_000_001), RangeError);
});

test('integer seqs show their terms comma-separated; digit seqs one character per symbol', async () => {
  assert.equal(symbolString((await norgardSource.prepare({}, 8)).slice(0, 8), null), '0, 1, -1, 2, 1, 0, -2, 3');
  assert.equal(symbolString([1, 0, 11], 12), '10b');
  for (const s of [norgardSource, recaman]) assert.equal(s.kind, 'int');
  assert.equal(fibonacciWordSource.kind, 'digit');
  assert.equal((await fibonacciWordSource.prepare({}, 10)).base, 2);
});
