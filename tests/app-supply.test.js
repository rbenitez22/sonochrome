// Piece 4a: the symbol supply (app/supply.js), with a fake slow source and with the real ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupply } from '../public/src/app/supply.js';
import { digitStringSeq } from '../public/src/sources/seq.js';
import { sourceById } from '../public/src/sources/index.js';

// A source whose prepare takes `delay` ms, honours the abort signal, records each call, and fails
// background (allowInline: false) calls when failBackground is set.
function fakeSource({ quickLength = 100, maxLength = 1_000, delay = 5, failBackground = false } = {}) {
  const calls = [];
  return {
    id: 'fake', maxLength, quickLength, calls,
    prepare(params, upTo, report = () => {}, { signal, allowInline = true } = {}) {
      calls.push({ upTo, allowInline, signal: !!signal });
      report(0.5, 'Half way');
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
          if (failBackground && !allowInline) reject(new Error('background tasks are not available'));
          else resolve(digitStringSeq('7'.repeat(upTo), 10));
        }, delay);
        signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('cancelled', 'AbortError')); });
      });
    },
  };
}

test('ready: prepares up to quickLength, reuses what it has, and leaves longer requests to compute', async () => {
  const src = fakeSource(), supply = createSupply(src);
  assert.equal(supply.seq, null);
  const seq = await supply.ready(80);
  assert.equal(seq.length, 80);
  assert.equal(await supply.ready(50), seq, 'already long enough: no new call');
  assert.equal(src.calls.length, 1);
  assert.equal(await supply.ready(101), null, 'past quickLength');
  assert.equal(src.calls.length, 1);
});

test('compute: reports progress, keeps the longest seq, caps at maxLength', async () => {
  const src = fakeSource(), supply = createSupply(src);
  const progress = [];
  const promise = supply.compute(500, (p, label) => progress.push([p, label]));
  assert.ok(supply.computing);
  const seq = await promise;
  assert.equal(seq.length, 500);
  assert.ok(!supply.computing);
  assert.deepEqual(progress, [[0.5, 'Half way']]);
  await supply.compute(5_000);
  assert.equal(src.calls.at(-1).upTo, 1_000, 'capped at maxLength');
  await supply.ready(10);
  assert.equal(supply.seq.length, 1_000, 'a shorter result never replaces a longer seq');
});

test('cancel: the computation rejects with AbortError and the supply is idle again', async () => {
  const supply = createSupply(fakeSource({ delay: 50 }));
  const promise = supply.compute(500);
  supply.cancel();
  await assert.rejects(promise, { name: 'AbortError' });
  assert.ok(!supply.computing);
  assert.equal(supply.seq, null);
});

test('refill: runs in the background without computing on the page, once at a time', async () => {
  const src = fakeSource(), supply = createSupply(src);
  await supply.ready(100);
  const first = supply.refill(400);
  assert.ok(supply.refilling);
  assert.equal(await supply.refill(600), false, 'one refill at a time');
  assert.equal(await first, true);
  assert.equal(supply.seq.length, 400);
  assert.equal(src.calls.at(-1).allowInline, false);
  assert.equal(await supply.refill(300), false, 'already there');
});

test('refill: never during a foreground compute, and compute stops a running refill', async () => {
  const supply = createSupply(fakeSource({ delay: 20 }));
  const computing = supply.compute(300);
  assert.equal(await supply.refill(900), false);
  await computing;
  const refill = supply.refill(900);
  const again = supply.compute(950);
  assert.equal(await refill, false, 'stopped by the compute');
  assert.ok(!supply.refillFailed, 'a stopped refill is not a failure');
  assert.equal((await again).length, 950);
});

test('refill: a failure turns refills off until resetRefill', async () => {
  const supply = createSupply(fakeSource({ failBackground: true }));
  assert.equal(await supply.refill(500), false);
  assert.ok(supply.refillFailed);
  assert.equal(await supply.refill(500), false);
  supply.resetRefill();
  assert.ok(!supply.refillFailed);
});

test('the real sources: π is quick to 20,000 and estimates beyond; Thue–Morse is always quick', async () => {
  const pi = createSupply(sourceById('pi'));
  assert.ok((await pi.ready(20_000)).length >= 20_000);
  assert.equal(await pi.ready(20_001), null);
  assert.equal(pi.estimateSeconds(1_000_000), 2);
  assert.ok(pi.estimateSeconds(20_000_000) > 40);
  const tm = createSupply(sourceById('thue-morse'));
  assert.ok((await tm.ready(19_000_000)).length >= 19_000_000);
  assert.equal(tm.estimateSeconds(100), null);
});
