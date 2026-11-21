/* Builds a source for a mathematical constant x, in any of BASES. Its symbols are the digits of x in that
   base, integer part first: π base 10 is "31415…", ln 2 is "0693…". Every constant is computed from
   position 0 (see engines.js): short requests on the page, longer ones in the digits worker. One digit
   string is cached per base, and a longer request recomputes from 0 and keeps the longest. */
import { digitStringSeq } from './seq.js';
import { computeConstant } from './constant-worker.js';
import { ENGINES } from './engines.js';

export const BASES = [2, 3, 4, 5, 6, 7, 8, 10, 12, 16];
const DEFAULT_BASE = 10;
const MAX_LENGTH = 20_000_000;
// Positions computed on the page without a noticeable wait (BigInt takes well under 0.1 s for any constant).
const QUICK_LENGTH = 20_000;
// Extra digits computed past the request, so truncation never touches the digits handed out.
const GUARD = 20;

// The base in params ({ base: '12' } from the route), or the default when missing or not offered.
export function readBase(params) {
  const b = parseInt(params?.base, 10);
  return BASES.includes(b) ? b : DEFAULT_BASE;
}

// An engine's ⌊x · baseⁿ⌋ → the first `upTo` digits, with the integer part's 0 when x < 1.
const digitsOf = (raw, n, upTo) => raw.padStart(n + 1, '0').slice(0, upTo);

/* spec: { id (an ENGINES key), name, glyph, blurb, quick(upTo, base) }. quick, when given, may return
   the digits for a short request itself (π uses Machin in base 10, matching the Pi Notes prototype);
   returning null falls back to the BigInt engine. */
export function makeConstant({ id, name, glyph, blurb, quick = () => null }) {
  const cache = new Map();
  const bigint = ENGINES[id].bigint;

  async function compute(upTo, base, report, signal, allowInline) {
    // Background requests (allowInline false) always go to the worker, however short, so playback never stutters.
    if (upTo <= QUICK_LENGTH && allowInline) {
      const own = quick(upTo, base);
      if (own !== null) return own;
      return digitsOf(bigint(upTo + GUARD, () => {}, base), upTo + GUARD, upTo);
    }
    const raw = await computeConstant(id, upTo + GUARD, {
      base, inline: (n) => bigint(n, () => {}, base), report, signal, allowInline,
    });
    return digitsOf(raw, upTo + GUARD, upTo);
  }

  return {
    id, name, glyph, blurb,
    kind: 'digit',
    params: [{ id: 'base', label: 'Base', choices: BASES, default: DEFAULT_BASE }],
    maxLength: MAX_LENGTH,
    quickLength: QUICK_LENGTH,
    // Rough seconds on a laptop to compute up to `upTo` (longer on a phone).
    estimateSeconds(upTo) { return Math.max(1, Math.round(2 * Math.pow(upTo / 1e6, 1.1))); },
    // options: { signal } cancels a worker computation; { allowInline: false } fails instead of
    // computing on the page when workers are unavailable (for background refills).
    async prepare(params, upTo, report = () => {}, { signal, allowInline = true } = {}) {
      if (upTo > MAX_LENGTH) throw new RangeError(`${name} is limited to ${MAX_LENGTH.toLocaleString('en-US')} digits`);
      const base = readBase(params);
      const have = cache.get(base) ?? '';
      if (upTo > have.length) {
        const text = await compute(upTo, base, report, signal, allowInline);
        if (text.length > have.length) cache.set(base, text);
      }
      return digitStringSeq(cache.get(base), base);
    },
  };
}
