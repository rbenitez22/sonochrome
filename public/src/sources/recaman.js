// Recamán's sequence (OEIS A005132): a(0) = 0; step back n if that lands on a positive number not yet
// visited, otherwise step forward n. An integer series computed from 0, kept as it grows: a longer
// request carries on from the last term. Capped at MAX_LENGTH terms (values reach about 6 million;
// the visited bitmap is about 8 MB).
import { arraySeq } from './seq.js';

const MAX_LENGTH = 1_000_000;

let values = new Float64Array(1024), visited = new Uint8Array(1024), length = 1;
values[0] = 0; visited[0] = 1;

function mark(v) {
  if (v >= visited.length) {
    const grown = new Uint8Array(Math.max(visited.length * 2, v + 1));
    grown.set(visited);
    visited = grown;
  }
  visited[v] = 1;
}

// Extend the computed terms to `upTo`.
function extend(upTo) {
  if (upTo > values.length) {
    const grown = new Float64Array(Math.max(values.length * 2, upTo));
    grown.set(values.subarray(0, length));
    values = grown;
  }
  let cur = values[length - 1];
  for (let n = length; n < upTo; n++) {
    const back = cur - n;
    cur = back > 0 && !(back < visited.length && visited[back]) ? back : cur + n;
    mark(cur);
    values[n] = cur;
  }
  length = Math.max(length, upTo);
}

export default {
  id: 'recaman',
  name: 'Recamán',
  glyph: 'R',
  blurb: 'Recamán’s sequence: from 0, step back n if that lands on a new positive number, else step forward n: 0, 1, 3, 6, 2, 7, 13, 20, 12…',
  kind: 'int',
  params: [],
  maxLength: MAX_LENGTH,
  quickLength: MAX_LENGTH,
  async prepare(params, upTo) {
    if (upTo > MAX_LENGTH) throw new RangeError(`Recamán is limited to ${MAX_LENGTH.toLocaleString('en-US')} terms`);
    if (upTo > length) extend(upTo);
    return arraySeq(values, length);
  },
};
