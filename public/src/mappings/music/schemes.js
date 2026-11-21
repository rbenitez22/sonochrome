/* Schemes turn a chunk of symbols into one note or rest.
   s = settings for ONE voice: { scheme, codeLen, fixedLen, range, root, scale, oct }.
   A chunk is a string with one character per symbol ('0'-'9', then 'a'-'z'); for base 10 it is
   the digits themselves, which is what pinned-code keys match. */
import { SCALES } from './theory.js';

export const PAIR_LEN = [0.25,0.5,0.5,0.5,1,1,1,1.5,2,3];
export const CODE_LEN = [1,0.5,1,2,0.5,1,0.5];
export const STEPS = [0,1,2,3,4,-1,-2,-3,-4,null];

// Any digit series: one symbol is one value, whatever the base.
const anyDigitBase = (seq) => (seq.base !== null && seq.base >= 2) || 'needs a digit series';
// Integer series (base null): one term per event.
const integersOnly = (seq) => seq.base === null || 'needs an integer series';
// The scheme tables have 10 entries, so the table-driven schemes need symbols below 10.
const upToBase10 = (seq) =>
  (seq.base !== null && seq.base <= 10) || 'needs a digit series in base 10 or lower';
const base10Only = (seq) =>
  seq.base === 10 || 'needs a base-10 digit series: its rules (÷9, mod 7) are tuned for decimal';

// accepts(seq) → true, or a reason the scheme can't read that seq.
export const SCHEMES = [
  { id: 'codes', label: 'Codes (groups of digits)', accepts: base10Only },
  { id: 'degrees', label: 'One digit = one scale step', accepts: anyDigitBase },
  { id: 'pairs', label: 'Pairs: pitch + length', accepts: upToBase10 },
  { id: 'steps', label: 'Digits as melodic steps', accepts: upToBase10 },
  { id: 'values', label: 'Value = scale step (centred)', accepts: integersOnly },
  { id: 'intervals', label: 'Differences = melodic steps', accepts: integersOnly },
];

// k wrapped into 0..m-1.
const wrap = (k, m) => ((k % m) + m) % m;

// Symbols read per event.
export function chunkSize(s) { return s.scheme === 'pairs' ? 2 : s.scheme === 'codes' ? s.codeLen : 1; }

// Turn one chunk into { rest, midi, beats[, pinned] }. Updates rd.cur for "steps". base is the seq's
// alphabet size; only "degrees" reads digits above 9 (the others accept base 10 or lower).
export function decodeChunk(s, d, overrides, rd, base = 10) {
  const sc = SCALES[s.scale], n = sc.length;
  const rootMidi = 12 * (s.oct + 1) + s.root;
  const deg = (k) => rootMidi + 12 * Math.floor(k / n) + sc[((k % n) + n) % n];
  const P = n * s.range;
  if (s.scheme === 'degrees') return { rest: false, midi: deg(parseInt(d, base)), beats: s.fixedLen };
  if (s.scheme === 'pairs') {
    const a = +d[0], b = +d[1];
    return a === 0 ? { rest: true, midi: null, beats: PAIR_LEN[b] } : { rest: false, midi: deg(a - 1), beats: PAIR_LEN[b] };
  }
  if (s.scheme === 'steps') {
    const st = STEPS[+d];
    if (st === null) return { rest: true, midi: null, beats: s.fixedLen };
    rd.cur = Math.max(0, Math.min(P, rd.cur + st));
    return { rest: false, midi: deg(rd.cur), beats: s.fixedLen };
  }
  // Integer schemes: the chunk is one term. Positions run 0..P (P + 1 of them), wrapping around.
  if (s.scheme === 'values') {
    return { rest: false, midi: deg(wrap(Math.floor(P / 2) + Number(d), P + 1)), beats: s.fixedLen };
  }
  if (s.scheme === 'intervals') {
    const v = Number(d), step = rd.prev === undefined ? 0 : v - rd.prev;
    rd.prev = v;
    rd.cur = wrap(rd.cur + step, P + 1);
    return { rest: false, midi: deg(rd.cur), beats: s.fixedLen };
  }
  const o = overrides[d];
  if (o) return { rest: o.rest, midi: o.midi, beats: o.beats, pinned: true };
  const c = parseInt(d, 10), beats = CODE_LEN[c % 7];
  return c % 9 === 0 ? { rest: true, midi: null, beats } : { rest: false, midi: deg(Math.floor(c / 9) % P), beats };
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Expected symbols one voice reads per beat (ignores pinned codes).
export function symbolsPerBeat(s) {
  if (s.scheme === 'codes') return s.codeLen / mean(CODE_LEN);
  if (s.scheme === 'pairs') return 2 / mean(PAIR_LEN);
  return 1 / s.fixedLen;
}
