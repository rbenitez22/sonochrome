// Piece 3b: voices, streaming and timing, against the Pi Notes prototype.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prototype, PI, piSeq, OVERRIDES_TEXT, SCHEME_CASES, clean, fromPrototype } from './music-equivalence.js';
import { SCALES } from '../public/src/mappings/music/theory.js';
import { parseOverrides } from '../public/src/mappings/music/overrides.js';
import { symbolString } from '../public/src/mappings/music/reader.js';
import { buildCountVoices, newStream, buildBar, regenerateVoices } from '../public/src/mappings/music/voices.js';
import { parseDuration, fmtTime, beatsForSeconds, streamSymbols, symbolsNeeded, DURATION_MIN, DURATION_MAX } from '../public/src/mappings/music/timing.js';
import { digitStringSeq } from '../public/src/sources/seq.js';
import { sourceById } from '../public/src/sources/index.js';

const OCTS = [3, 2, 4, 1];
const overridesFor = (codeLen) => parseOverrides(OVERRIDES_TEXT, codeLen).map;
// The first n π digits as a seq: too short on purpose, to test running out.
const shortSeq = (n) => digitStringSeq(PI.slice(0, n), 10);

test('Notes mode: buildCountVoices matches the prototype on the pi-notes grid', () => {
  let cases = 0;
  for (const [scheme, codeLen] of SCHEME_CASES) for (const scale of Object.keys(SCALES)) for (const nv of [1, 2, 3, 4])
    for (const start of [0, 1, 777, 19_000, 19_900]) for (const count of [4, 24, 128]) for (const range of [1, 3]) for (const fixedLen of [0.5, 2]) {
      const s = { scheme, codeLen, fixedLen, range, root: (start + nv) % 12, scale, count, start };
      const octs = OCTS.slice(0, nv), ov = overridesFor(codeLen);
      const got = buildCountVoices(s, piSeq, ov, octs);
      assert.deepEqual(clean(got), fromPrototype(prototype.buildCountVoices(s, PI, ov, octs)), JSON.stringify(s));
      cases++;
    }
  assert.equal(cases, 11_520);
});

test('Time/Infinite: newStream and buildBar match the prototype bar by bar, state included', () => {
  for (const [scheme, codeLen] of SCHEME_CASES) for (const scale of ['Major', 'Blues', 'Chromatic']) for (const nv of [1, 2, 4])
    for (const [start, limit] of [[0, Infinity], [123, 30.5], [19_500, Infinity], [4321, 64]]) {
      const s = { scheme, codeLen, fixedLen: 0.5, range: 2, root: 7, scale, start };
      const octs = OCTS.slice(0, nv), ov = overridesFor(codeLen);
      const ours = newStream(s, octs), theirs = prototype.newStream(s, octs);
      assert.deepEqual(clean(ours), fromPrototype(theirs));
      for (let b = 0; b < 60; b++) {
        const r = buildBar(ours, piSeq, ov, limit);
        assert.deepEqual(clean(r), fromPrototype(prototype.buildBar(theirs, PI, ov, limit)), JSON.stringify({ s, nv, limit, b }));
        assert.deepEqual(clean(ours), fromPrototype(theirs));
        if (!r || r.done) break;
      }
    }
});

test('regenerateVoices matches the prototype and the streamed events, and is null when the seq runs out', () => {
  for (const [scheme, codeLen] of SCHEME_CASES) for (const nv of [1, 3]) for (const limit of [4, 30.5, 64]) {
    const s = { scheme, codeLen, fixedLen: 0.5, range: 2, root: 3, scale: 'Natural minor', start: 4321 };
    const octs = OCTS.slice(0, nv), ov = overridesFor(codeLen);
    const got = regenerateVoices(s, piSeq, ov, octs, limit);
    assert.deepEqual(clean(got), fromPrototype(prototype.regenerateVoices(s, PI, ov, octs, limit)));
    const st = newStream(s, octs), streamed = octs.map(() => []);
    for (;;) {
      const r = buildBar(st, piSeq, ov, limit);
      r.events.forEach((list, k) => streamed[k].push(...list));
      if (r.done || r.barEnd >= limit) break;
    }
    assert.deepEqual(got, streamed);
    assert.equal(regenerateVoices(s, shortSeq(4400), ov, octs, 1e6), null);
  }
});

test('buildBar properties: contiguous voices, symbols read in order, rollback when short, trims to the limit', () => {
  for (const [scheme, codeLen] of SCHEME_CASES) for (const nv of [1, 2, 4]) {
    const s = { scheme, codeLen, fixedLen: 1, range: 2, root: 0, scale: 'Major', start: 123 };
    const ov = overridesFor(codeLen), st = newStream(s, OCTS.slice(0, nv));
    let read = '';
    const ends = st.voices.map(() => 0);
    for (let b = 0; b < 40; b++) {
      const r = buildBar(st, piSeq, ov);
      r.events.forEach((list, k) => list.forEach((e) => {
        assert.ok(Math.abs(e.startBeat - ends[k]) < 1e-9, 'contiguous');
        ends[k] += e.beats;
        read += e.symbols;
      }));
      ends.forEach((x) => assert.ok(x >= r.barEnd - 1e-9, 'voice reaches the barline'));
    }
    assert.equal(read, symbolString(piSeq.slice(123, 123 + read.length)), 'symbols read in order with no gaps');
    assert.equal(st.pos, 123 + read.length);
    const before = clean(st);
    assert.equal(buildBar(st, shortSeq(st.pos + 1), ov), null);
    assert.deepEqual(clean(st), before, 'rollback');
    const st2 = newStream(s, OCTS.slice(0, Math.min(nv, 2)));
    let r, n = 0;
    do { r = buildBar(st2, piSeq, ov, 30.5); n++; } while (!r.done);
    assert.equal(n, 8);
    st2.voices.forEach((v) => assert.ok(Math.abs(v.end - 30.5) < 1e-9, 'trimmed to the limit'));
  }
});

test('streamSymbols covers what a long stream actually reads', async () => {
  const big = await sourceById('pi').prepare({}, 60_000);
  for (const [scheme, codeLen] of SCHEME_CASES) for (const fixedLen of [0.5, 1]) for (const nv of [1, 4]) {
    const s = { scheme, codeLen, fixedLen, range: 2, root: 0, scale: 'Major', start: 0 };
    const ov = overridesFor(codeLen), beats = 400, st = newStream(s, OCTS.slice(0, nv));
    let r;
    do { r = buildBar(st, big, ov, beats); assert.ok(r, 'enough symbols in the test seq'); } while (!r.done);
    assert.ok(st.pos <= streamSymbols(s, nv, beats), `${scheme}${codeLen} fl${fixedLen} nv${nv}: read ${st.pos}`);
  }
});

test('streamSymbols and symbolsNeeded match the prototype’s streamDigits and digitsNeeded', () => {
  for (const [scheme, codeLen] of SCHEME_CASES) for (const fixedLen of [0.5, 2]) for (const nv of [1, 3]) {
    const s = { scheme, codeLen, fixedLen, start: 777, count: 24 };
    assert.equal(streamSymbols(s, nv, 123.5), prototype.streamDigits(s, nv, 123.5));
    assert.equal(symbolsNeeded(s, nv), prototype.digitsNeeded(s, nv));
  }
});

test('durations, times and beats', () => {
  assert.equal(parseDuration('1:30'), 90);
  assert.equal(parseDuration('90'), 90);
  assert.equal(parseDuration(' 0:05 '), 5);
  assert.equal(parseDuration('1:02:03'), 3723);
  for (const bad of ['1:60', '1:5:', 'abc', '']) assert.equal(parseDuration(bad), null, bad);
  assert.equal(fmtTime(0), '0:00');
  assert.equal(fmtTime(75.9), '1:15');
  assert.equal(fmtTime(3723), '1:02:03');
  assert.equal(beatsForSeconds(60, 110), 110);
  assert.equal(beatsForSeconds(5, 110), 9.25);
  assert.equal(beatsForSeconds(0, 60), 0.25);
  assert.deepEqual([DURATION_MIN, DURATION_MAX], [5, 5999]);
});
