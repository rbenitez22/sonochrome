// The Fibonacci word (OEIS A003849): start with 0 and keep replacing 0 → 01, 1 → 0. A binary digit series
// with an exact formula, so any position is instant: a(n) = 2 + ⌊(n+1)φ⌋ − ⌊(n+2)φ⌋.
import { formulaSeq } from './seq.js';

const LENGTH = Number.MAX_SAFE_INTEGER;
// Below this, 5n² is exact in a double, so ⌊√(5n²)⌋ can be found with Math.sqrt and corrected.
const NUMBER_LIMIT = 40_000_000;

// ⌊√x⌋ for a whole number x < 2^53.
function isqrtNumber(x) {
  let s = Math.floor(Math.sqrt(x));
  while (s * s > x) s--;
  while ((s + 1) * (s + 1) <= x) s++;
  return s;
}
function isqrtBig(n) {
  if (n < 2n) return n;
  let x = 1n << BigInt((n.toString(2).length + 1) >> 1);
  for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
}

// ⌊nφ⌋ = ⌊(n + ⌊√5·n⌋) / 2⌋, exactly.
function floorPhi(n) {
  if (n < NUMBER_LIMIT) return Math.floor((n + isqrtNumber(5 * n * n)) / 2);
  const N = BigInt(n);
  return Number((N + isqrtBig(5n * N * N)) / 2n);
}

export function fibonacciWord(n) { return 2 + floorPhi(n + 1) - floorPhi(n + 2); }

const seq = formulaSeq(LENGTH, 2, fibonacciWord);

export default {
  id: 'fibonacci-word',
  name: 'Fibonacci word',
  glyph: '010',
  blurb: 'Start with 0 and keep replacing 0 → 01 and 1 → 0: 0100101001001… The binary shadow of the golden ratio.',
  kind: 'digit',
  params: [],
  maxLength: LENGTH,
  quickLength: LENGTH,
  async prepare() { return seq; },
};
