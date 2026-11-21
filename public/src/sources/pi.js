// π: a constant computed from position 0. Symbols are the decimal digits "31415926…" (position 0 is the 3).
// Up to 20,000 digits are computed on the page with Machin's formula; beyond that, the Chudnovsky series
// runs in the digits worker (GMP when it loads, BigInt otherwise). There is no way to start at an offset,
// so a longer request recomputes from 0 and the longest result is kept.
import { digitStringSeq } from './seq.js';
import { computeConstant } from './constant-worker.js';

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

// Chudnovsky binary splitting on BigInt, with progress callback report(p, label). Returns "3141592...".
export function chudnovsky(digits, report) {
  const C3_OVER_24 = 10939058860032000n;
  const N = Math.floor(digits / 14.181647462725477) + 2;
  const wc = new Map();
  const W = (n) => {
    if (n <= 1) return 1;
    let v = wc.get(n);
    if (v === undefined) { v = n * Math.log2(n + 1) + W(n >> 1) + W(n - (n >> 1)); wc.set(n, v); }
    return v;
  };
  const totalW = W(N);
  let done = 0, last = 0;
  const tick = () => { const p = 0.72 * done / totalW; if (p - last >= 0.004) { last = p; report(p, 'Summing the series'); } };
  const bs = (a, b, needP) => {
    if (b - a === 1) {
      let P, Q;
      if (a === 0) { P = 1n; Q = 1n; }
      else { const A = BigInt(a); P = (6n * A - 5n) * (2n * A - 1n) * (6n * A - 1n); Q = A * A * A * C3_OVER_24; }
      let T = P * (13591409n + 545140134n * BigInt(a));
      if (a & 1) T = -T;
      done += 1; tick();
      return [P, Q, T];
    }
    const m = (a + b) >> 1;
    const L = bs(a, m, true), R = bs(m, b, needP);
    const out = [needP ? L[0] * R[0] : 0n, L[1] * R[1], R[1] * L[2] + L[0] * R[2]];
    done += W(b - a) - W(m - a) - W(b - m); tick();
    return out;
  };
  const isqrt = (n) => {
    if (n < (1n << 52n)) return BigInt(Math.floor(Math.sqrt(Number(n))));
    const bl = n.toString(16).length * 4;
    const k = BigInt(bl >> 2);
    let x = (isqrt(n >> (2n * k)) + 1n) << k;
    for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
  };
  const [, Q, T] = bs(0, N, false);
  report(0.74, 'Square root');
  const sq = isqrt(10005n * 10n ** (2n * BigInt(digits)));
  report(0.86, 'Dividing');
  const pi = (Q * 426880n * sq) / T;
  report(0.94, 'Writing digits');
  return pi.toString();
}
// The same Chudnovsky series on GMP integers (gmp-wasm's low-level mpz binding `b`), for browsers
// whose BigInt is too small (Firefox caps BigInt at 2^20 bits, about 157k digits here).
// Returns the same "3141592..." string. Intermediates are freed as soon as they are combined.
export function chudnovskyGmp(b, digits, report) {
  const N = Math.floor(digits / 14.181647462725477) + 2;
  const wc = new Map();
  const W = (n) => {
    if (n <= 1) return 1;
    let v = wc.get(n);
    if (v === undefined) { v = n * Math.log2(n + 1) + W(n >> 1) + W(n - (n >> 1)); wc.set(n, v); }
    return v;
  };
  const totalW = W(N);
  let done = 0, last = 0;
  const tick = () => { const p = 0.72 * done / totalW; if (p - last >= 0.004) { last = p; report(p, 'Summing the series'); } };
  const nz = () => { const p = b.mpz_t(); b.mpz_init(p); return p; };
  const free = (...ps) => ps.forEach((p) => { if (p) { b.mpz_clear(p); b.mpz_t_free(p); } });
  const C = nz();
  b.mpz_set_string(C, '10939058860032000', 10);
  const bs = (lo, hi, needP) => {
    if (hi - lo === 1) {
      const P = nz(), Q = nz(), T = nz();
      if (lo === 0) { b.mpz_set_ui(P, 1); b.mpz_set_ui(Q, 1); }
      else {
        b.mpz_set_ui(P, 6 * lo - 5); b.mpz_mul_ui(P, P, 2 * lo - 1); b.mpz_mul_ui(P, P, 6 * lo - 1);
        b.mpz_set_ui(Q, lo); b.mpz_mul_ui(Q, Q, lo); b.mpz_mul_ui(Q, Q, lo); b.mpz_mul(Q, Q, C);
      }
      b.mpz_set_ui(T, lo); b.mpz_mul_ui(T, T, 545140134); b.mpz_add_ui(T, T, 13591409); b.mpz_mul(T, T, P);
      if (lo & 1) b.mpz_neg(T, T);
      done += 1; tick();
      return [P, Q, T];
    }
    const m = (lo + hi) >> 1;
    const [Lp, Lq, Lt] = bs(lo, m, true), [Rp, Rq, Rt] = bs(m, hi, needP);
    b.mpz_mul(Lt, Lt, Rq); b.mpz_mul(Rt, Rt, Lp); b.mpz_add(Lt, Lt, Rt);  // T = Rq*Lt + Lp*Rt
    b.mpz_mul(Lq, Lq, Rq);                                                // Q = Lq*Rq
    if (needP) b.mpz_mul(Lp, Lp, Rp);                                     // P = Lp*Rp
    free(Rp, Rq, Rt);
    done += W(hi - lo) - W(m - lo) - W(hi - m); tick();
    if (!needP) { free(Lp); return [null, Lq, Lt]; }
    return [Lp, Lq, Lt];
  };
  const [P, Q, T] = bs(0, N, false);
  free(P, C);
  report(0.74, 'Square root');
  const sq = nz();
  b.mpz_ui_pow_ui(sq, 10, 2 * digits); b.mpz_mul_ui(sq, sq, 10005); b.mpz_sqrt(sq, sq);
  report(0.86, 'Dividing');
  b.mpz_mul(Q, Q, sq); b.mpz_mul_ui(Q, Q, 426880); b.mpz_tdiv_q(Q, Q, T);
  free(sq, T);
  report(0.94, 'Writing digits');
  const s = b.mpz_to_string(Q, 10);
  free(Q);
  return s;
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
