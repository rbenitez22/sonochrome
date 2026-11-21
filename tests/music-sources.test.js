// Piece 3d: the music core on every source and every scheme that accepts it, with no prototype to
// compare against. Checks that hold for any series: notes come out, beats add up, events point back
// at their symbols, and the MusicXML is sound. Runs over SOURCES, so new sources are covered too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { SOURCES } from '../public/src/sources/index.js';
import { SCHEMES } from '../public/src/mappings/music/schemes.js';
import { symbolString, eventSpan } from '../public/src/mappings/music/reader.js';
import { buildCountVoices, newStream, buildBar, regenerateVoices } from '../public/src/mappings/music/voices.js';
import { toMeasures, measuresInRange } from '../public/src/mappings/music/measures.js';
import { toMusicXML, padBars } from '../public/src/mappings/music/musicxml.js';
import { assertMusicXML } from './musicxml-checks.js';

const LENGTH = 20_000;
const OCTS = [4, 3, 2];
const BASE = { codeLen: 3, fixedLen: 0.5, range: 2, root: 0, scale: 'Major' };

// Every event's position and symbols agree with the seq, and the events follow each other in beats.
function assertEvents(seq, events) {
  let beat = 0;
  for (const e of events) {
    assert.equal(symbolString(seq.slice(e.at, e.at + eventSpan(e)), seq.base), e.symbols, 'event points at its symbols');
    assert.ok(Math.abs(e.startBeat - beat) < 1e-9, 'events are contiguous');
    assert.ok(e.beats > 0, 'every event has a length');
    assert.ok(e.rest ? e.midi === null : Number.isInteger(e.midi), 'a note has a pitch, a rest has none');
    beat += e.beats;
  }
  return beat;
}

function scoreXML(bars) {
  return toMusicXML({ title: 't', subtitle: 's', bpm: 90, parts: bars.map((b, k) => ({ name: 'V' + k, program: 1, clef: 'treble', bars: b })) });
}

for (const source of SOURCES) {
  const seq = await source.prepare({}, LENGTH);
  const schemes = SCHEMES.filter((sc) => sc.accepts(seq) === true);

  test(`${source.id}: at least one scheme accepts it`, () => {
    assert.ok(schemes.length > 0);
  });

  for (const sc of schemes) {
    test(`${source.id} × ${sc.id}: Notes mode gives equal-length voices and a sound score`, () => {
      for (const start of [0, 1, 5_000]) {
        const s = { ...BASE, scheme: sc.id, count: 48, start };
        const { voices, nextPos } = buildCountVoices(s, seq, {}, OCTS);
        assert.equal(voices[0].events.length, 48);
        assert.ok(voices[0].events.some((e) => !e.rest), 'voice 1 has notes');
        voices.forEach((v) => assert.ok(Math.abs(assertEvents(seq, v.events) - v.total) < 1e-9));
        voices.slice(1).forEach((v) => assert.ok(Math.abs(v.total - voices[0].total) < 1e-9, 'later voices fill the same beats'));
        assert.ok(nextPos > start);
        const bars = padBars(voices.map((v) => toMeasures(v.events)));
        assertMusicXML(scoreXML(bars), bars);
      }
    });

    test(`${source.id} × ${sc.id}: streaming fills every bar, and regenerating gives the same piece`, () => {
      const s = { ...BASE, scheme: sc.id, start: 321 }, limit = 30.5;
      const st = newStream(s, OCTS), streamed = OCTS.map(() => []);
      let r;
      do {
        r = buildBar(st, seq, {}, limit);
        assert.ok(r, 'the seq is long enough');
        r.events.forEach((list, k) => streamed[k].push(...list));
      } while (!r.done);
      streamed.forEach((list) => assert.ok(Math.abs(assertEvents(seq, list) - limit) < 1e-9, 'each voice reaches the limit'));
      assert.deepEqual(regenerateVoices(s, seq, {}, OCTS, limit), streamed);
      const bars = padBars(streamed.map((list) => measuresInRange(list, 0, 32)));
      bars.flat().forEach((bar) => assert.ok(Math.abs(bar.reduce((x, p) => x + p.beats, 0) - 4) < 1e-9, 'bar sums to 4'));
      assertMusicXML(scoreXML(bars), bars);
    });
  }
}

test('a scheme that refuses a seq gives a reason; among digit series only codes refuses the binary ones', async () => {
  const refused = [];
  for (const source of SOURCES) {
    const seq = await source.prepare({}, LENGTH);
    for (const sc of SCHEMES) {
      const verdict = sc.accepts(seq);
      if (verdict === true) continue;
      assert.equal(typeof verdict, 'string');
      refused.push(`${source.id}/${sc.id}`);
    }
  }
  // Integer series refuse every digit scheme and digit series every integer scheme; among the rest,
  // only codes refuses the binary series.
  const intSeries = ['norgard', 'recaman'], intSchemes = ['values', 'intervals'];
  const digitOnDigit = refused.filter((r) => { const [src, sc] = r.split('/'); return !intSeries.includes(src) && !intSchemes.includes(sc); });
  assert.deepEqual(digitOnDigit, ['thue-morse/codes', 'fibonacci-word/codes']);
  for (const src of intSeries) for (const sc of ['codes', 'degrees', 'pairs', 'steps']) assert.ok(refused.includes(`${src}/${sc}`), `${src}/${sc}`);
});

test('the music core never mentions π: it is one series among many', () => {
  const dir = new URL('../public/src/mappings/music/', import.meta.url);
  for (const f of readdirSync(dir)) {
    const text = readFileSync(new URL(f, dir), 'utf8');
    assert.doesNotMatch(text, /\bpi\b|π|digits? of/i, f);
  }
});
