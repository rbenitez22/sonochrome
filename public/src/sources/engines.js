/* Digit engines for the constants: each computes ⌊x · baseⁿ⌋ and returns it written in that base
   (integer part first, lowercase digits beyond 9). Two versions of each: BigInt, and GMP through
   gmp-wasm's low-level mpz binding `b` (no size cap, and faster). They run in the digits worker, and
   the BigInt ones on the page for short requests. report(p, label) receives progress from 0 to 1.
   Self-contained apart from each other: no DOM, nothing from the page. */

// ---- shared BigInt helpers ----

// ⌊√n⌋ for n ≥ 0 (Newton's method from a power of two above the root).
function isqrtBig(n) {
  if (n < 2n) return n;
  let x = 1n << BigInt((n.toString(2).length + 1) >> 1);
  for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
}

// ---- GMP helpers ----

const gmpNew = (b) => { const p = b.mpz_t(); b.mpz_init(p); return p; };
const gmpFree = (b, ...ps) => ps.forEach((p) => { if (p) { b.mpz_clear(p); b.mpz_t_free(p); } });
// A new mpz holding base^e.
function gmpPow(b, base, e) { const p = gmpNew(b); b.mpz_ui_pow_ui(p, base, e); return p; }

// ---- π ----

// π by the Chudnovsky series with binary splitting on BigInt, with progress callback report(p, label).
// Returns ⌊π · base^digits⌋ in that base: "3141592..." for base 10.
export function chudnovsky(digits, report, base = 10) {
  const C3_OVER_24 = 10939058860032000n;
  const N = Math.floor(digits * Math.log10(base) / 14.181647462725477) + 2;
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
  const sq = isqrt(10005n * BigInt(base) ** (2n * BigInt(digits)));
  report(0.86, 'Dividing');
  const pi = (Q * 426880n * sq) / T;
  report(0.94, 'Writing digits');
  return pi.toString(base);
}
// The same Chudnovsky series on GMP integers (gmp-wasm's low-level mpz binding `b`), for browsers
// whose BigInt is too small (Firefox caps BigInt at 2^20 bits, about 157k digits here).
// Returns the same string. Intermediates are freed as soon as they are combined.
export function chudnovskyGmp(b, digits, report, base = 10) {
  const N = Math.floor(digits * Math.log10(base) / 14.181647462725477) + 2;
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
  b.mpz_ui_pow_ui(sq, base, 2 * digits); b.mpz_mul_ui(sq, sq, 10005); b.mpz_sqrt(sq, sq);
  report(0.86, 'Dividing');
  b.mpz_mul(Q, Q, sq); b.mpz_mul_ui(Q, Q, 426880); b.mpz_tdiv_q(Q, Q, T);
  free(sq, T);
  report(0.94, 'Writing digits');
  const s = b.mpz_to_string(Q, base);
  free(Q);
  return s;
}

// ---- e = Σ 1/k! ----

// Terms needed so that k! exceeds base^n (with a few to spare).
function eTerms(n, base) {
  const target = n * Math.log(base) + 10;
  let k = 1, lg = 0;
  while (lg < target) { k++; lg += Math.log(k); }
  return k;
}

// Binary splitting of Σ_{k=a+1}^{b} 1/((a+1)…k) = P/Q, with Q = (a+1)…b.
export function eBigInt(n, report, base = 10) {
  const N = eTerms(n, base);
  const bs = (a, c) => {
    if (c - a === 1) return [1n, BigInt(c)];
    const m = (a + c) >> 1;
    const [p1, q1] = bs(a, m), [p2, q2] = bs(m, c);
    return [p1 * q2 + p2, q1 * q2];
  };
  report(0.1, 'Summing the series');
  const [p, q] = bs(0, N);
  report(0.8, 'Dividing');
  return (BigInt(base) ** BigInt(n) * (p + q) / q).toString(base);
}

export function eGmp(b, n, report, base = 10) {
  const N = eTerms(n, base);
  const bs = (a, c) => {
    const P = gmpNew(b), Q = gmpNew(b);
    if (c - a === 1) { b.mpz_set_ui(P, 1); b.mpz_set_ui(Q, c); return [P, Q]; }
    gmpFree(b, P, Q);
    const m = (a + c) >> 1;
    const [p1, q1] = bs(a, m), [p2, q2] = bs(m, c);
    b.mpz_mul(p1, p1, q2); b.mpz_add(p1, p1, p2);   // P = p1·q2 + p2
    b.mpz_mul(q1, q1, q2);                          // Q = q1·q2
    gmpFree(b, p2, q2);
    return [p1, q1];
  };
  report(0.1, 'Summing the series');
  const [P, Q] = bs(0, N);
  report(0.8, 'Dividing');
  const r = gmpPow(b, base, n);
  b.mpz_add(P, P, Q); b.mpz_mul(r, r, P); b.mpz_tdiv_q(r, r, Q);
  const s = b.mpz_to_string(r, base);
  gmpFree(b, P, Q, r);
  return s;
}

// ---- √2 and φ = (1 + √5) / 2 ----

export function sqrt2BigInt(n, report, base = 10) {
  report(0.1, 'Square root');
  return isqrtBig(2n * BigInt(base) ** (2n * BigInt(n))).toString(base);
}

export function sqrt2Gmp(b, n, report, base = 10) {
  report(0.1, 'Square root');
  const r = gmpPow(b, base, 2 * n);
  b.mpz_mul_ui(r, r, 2); b.mpz_sqrt(r, r);
  const s = b.mpz_to_string(r, base);
  gmpFree(b, r);
  return s;
}

// ⌊(bⁿ + ⌊√5·bⁿ⌋) / 2⌋ = ⌊φ·bⁿ⌋ exactly, since bⁿ is a whole number.
export function phiBigInt(n, report, base = 10) {
  report(0.1, 'Square root');
  const one = BigInt(base) ** BigInt(n);
  return ((one + isqrtBig(5n * one * one)) / 2n).toString(base);
}

export function phiGmp(b, n, report, base = 10) {
  report(0.1, 'Square root');
  const one = gmpPow(b, base, n), r = gmpPow(b, base, 2 * n);
  b.mpz_mul_ui(r, r, 5); b.mpz_sqrt(r, r); b.mpz_add(r, r, one); b.mpz_fdiv_q_2exp(r, r, 1);
  const s = b.mpz_to_string(r, base);
  gmpFree(b, one, r);
  return s;
}

// ---- ln 2 = 18·atanh(1/26) − 2·atanh(1/4801) + 8·atanh(1/8749) ----

const LN2_TERMS = [[18, 26], [-2, 4801], [8, 8749]];

// Terms of atanh(1/x) = Σ 1/((2k+1)·x^(2k+1)) needed for n digits in this base (with a few to spare).
const atanhTerms = (x, n, base) => Math.ceil((n * Math.log(base) + 10) / (2 * Math.log(x))) + 2;

/* Binary splitting of S(a, c) = Σ_{k=a}^{c-1} 1/((2k+1)·x^(2k+1)) as T / (B·Q), with
   Q = x^(2(c−a)) (times x when a = 0) and B = Π (2k+1): combining halves gives
   T = B₂·Q₂·T₁ + B₁·T₂, B = B₁·B₂, Q = Q₁·Q₂. */
function atanhBigInt(x, one, N) {
  const X = BigInt(x), X2 = X * X;
  const bs = (a, c) => {
    if (c - a === 1) return [1n, BigInt(2 * a + 1), a === 0 ? X : X2];
    const m = (a + c) >> 1;
    const [t1, b1, q1] = bs(a, m), [t2, b2, q2] = bs(m, c);
    return [b2 * q2 * t1 + b1 * t2, b1 * b2, q1 * q2];
  };
  const [t, bb, q] = bs(0, N);
  return one * t / (bb * q);
}

export function ln2BigInt(n, report, base = 10) {
  const one = BigInt(base) ** BigInt(n);
  let sum = 0n;
  LN2_TERMS.forEach(([c, x], i) => {
    report(0.1 + 0.25 * i, 'Summing the series');
    sum += BigInt(c) * atanhBigInt(x, one, atanhTerms(x, n, base));
  });
  return sum.toString(base);
}

function atanhGmp(b, x, one, N) {
  const bs = (a, c) => {
    if (c - a === 1) {
      const T = gmpNew(b), B = gmpNew(b), Q = gmpNew(b);
      b.mpz_set_ui(T, 1); b.mpz_set_ui(B, 2 * a + 1); b.mpz_set_ui(Q, x); if (a > 0) b.mpz_mul_ui(Q, Q, x);
      return [T, B, Q];
    }
    const m = (a + c) >> 1;
    const [t1, b1, q1] = bs(a, m), [t2, b2, q2] = bs(m, c);
    b.mpz_mul(t1, t1, b2); b.mpz_mul(t1, t1, q2);   // T = B₂·Q₂·T₁ …
    b.mpz_mul(t2, t2, b1); b.mpz_add(t1, t1, t2);   //   … + B₁·T₂
    b.mpz_mul(b1, b1, b2); b.mpz_mul(q1, q1, q2);   // B = B₁·B₂, Q = Q₁·Q₂
    gmpFree(b, t2, b2, q2);
    return [t1, b1, q1];
  };
  const [T, B, Q] = bs(0, N);
  b.mpz_mul(T, T, one); b.mpz_mul(B, B, Q); b.mpz_tdiv_q(T, T, B);
  gmpFree(b, B, Q);
  return T;
}

export function ln2Gmp(b, n, report, base = 10) {
  const one = gmpPow(b, base, n), sum = gmpNew(b);
  b.mpz_set_ui(sum, 0);
  LN2_TERMS.forEach(([c, x], i) => {
    report(0.1 + 0.25 * i, 'Summing the series');
    const t = atanhGmp(b, x, one, atanhTerms(x, n, base));
    b.mpz_mul_si(t, t, c); b.mpz_add(sum, sum, t);
    gmpFree(b, t);
  });
  const s = b.mpz_to_string(sum, base);
  gmpFree(b, one, sum);
  return s;
}

// ---- by constant ----

// Engines per constant id: bigint(n, report, base) and gmp(binding, n, report, base).
export const ENGINES = {
  pi: { bigint: chudnovsky, gmp: chudnovskyGmp },
  e: { bigint: eBigInt, gmp: eGmp },
  sqrt2: { bigint: sqrt2BigInt, gmp: sqrt2Gmp },
  phi: { bigint: phiBigInt, gmp: phiGmp },
  ln2: { bigint: ln2BigInt, gmp: ln2Gmp },
};
