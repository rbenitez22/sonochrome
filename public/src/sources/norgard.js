// Per Nørgård's infinity series (OEIS A004718): a(0) = 0, a(2n) = −a(n), a(2n+1) = a(n) + 1.
// An integer series with a formula, so any position is instant: read the bits of n from the most
// significant; a 1 adds one, a 0 negates.
import { formulaSeq } from './seq.js';

const LENGTH = Number.MAX_SAFE_INTEGER;

export function norgard(n) {
  let bits = [];
  for (let m = n; m > 0; m = Math.floor(m / 2)) bits.push(m % 2);
  let v = 0;
  for (let i = bits.length - 1; i >= 0; i--) v = bits[i] ? v + 1 : 0 - v;   // 0 - v, not -v: no -0
  return v;
}

const seq = formulaSeq(LENGTH, null, norgard);

export default {
  id: 'norgard',
  name: 'Nørgård',
  glyph: '∞',
  blurb: 'Per Nørgård’s infinity series: 0, 1, −1, 2, 1, 0, −2, 3… Every other term replays the whole series, mirrored.',
  kind: 'int',
  params: [],
  maxLength: LENGTH,
  quickLength: LENGTH,
  async prepare() { return seq; },
};
