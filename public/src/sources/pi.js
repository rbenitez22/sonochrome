// π: a constant computed from position 0. Symbols are the decimal digits "31415926…" (position 0 is the 3).
// Up to 20,000 digits are computed on the page with Machin's formula; beyond that, the Chudnovsky series
// runs in the digits worker (GMP when it loads, BigInt otherwise). There is no way to start at an offset,
// so a longer request recomputes from 0 and the longest result is kept.
import { digitStringSeq } from './seq.js';
import { computeConstant } from './constant-worker.js';
import { chudnovsky } from './engines.js';

const MAX_LENGTH = 20_000_000;
const ON_PAGE_LIMIT = 20_000;
const ON_PAGE_MIN = 3_000;
// Extra digits computed past the request, so truncation never touches the digits handed out.
const GUARD = 20;

// π by Machin's formula on BigInt: fast enough on the page for a few thousand digits.
export function machin(n) {
  const one = 10n ** BigInt(n + 12);
  const acot = (x) => {
    const X = BigInt(x), X2 = X * X;
    let term = one / X, sum = term, k = 1n, sign = -1n;
    while (term > 0n) { term /= X2; k += 2n; sum += sign * (term / k); sign = -sign; }
    return sum;
  };
  return (4n * (4n * acot(5) - acot(239))).toString().slice(0, n);
}


let cached = '';

async function compute(upTo, report, signal, allowInline) {
  // Background requests (allowInline false) always go to the worker, however short, so playback never stutters.
  if (upTo <= ON_PAGE_LIMIT && allowInline) return machin(Math.max(upTo, ON_PAGE_MIN));
  const text = await computeConstant('pi', upTo + GUARD, {
    inline: (count) => chudnovsky(count, () => {}), report, signal, allowInline,
  });
  return text.slice(0, upTo);
}

export default {
  id: 'pi',
  name: 'π',
  glyph: 'π',
  blurb: 'The ratio of a circle’s circumference to its diameter: 3.14159… Its digits never repeat.',
  kind: 'digit',
  params: [],
  maxLength: MAX_LENGTH,
  quickLength: ON_PAGE_LIMIT,
  // Rough seconds on a laptop to compute up to `upTo` (longer on a phone).
  estimateSeconds(upTo) { return Math.max(1, Math.round(2 * Math.pow(upTo / 1e6, 1.1))); },
  // options: { signal } cancels a worker computation; { allowInline: false } fails instead of
  // computing on the page when workers are unavailable (for background refills).
  async prepare(params, upTo, report = () => {}, { signal, allowInline = true } = {}) {
    if (upTo > MAX_LENGTH) throw new RangeError(`π is limited to ${MAX_LENGTH.toLocaleString('en-US')} digits`);
    if (upTo > cached.length) {
      const text = await compute(upTo, report, signal, allowInline);
      if (text.length > cached.length) cached = text;
    }
    return digitStringSeq(cached, 10);
  },
};
