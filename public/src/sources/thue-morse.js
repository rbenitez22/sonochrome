// The Thue–Morse sequence (OEIS A010060): the parity of the number of 1 bits in n.
// A formula series: any position is instant, so prepare() has nothing to compute.
import { formulaSeq } from './seq.js';

const LENGTH = Number.MAX_SAFE_INTEGER;

export function thueMorse(n) {
  let parity = 0;
  while (n > 0) { parity ^= n % 2; n = Math.floor(n / 2); }
  return parity;
}

const seq = formulaSeq(LENGTH, 2, thueMorse);

export default {
  id: 'thue-morse',
  name: 'Thue–Morse',
  blurb: 'Start with 0, then keep appending the complement: 0 1 10 1001 … Never repeats a block three times in a row.',
  kind: 'digit',
  params: [],
  maxLength: LENGTH,
  async prepare() { return seq; },
};
