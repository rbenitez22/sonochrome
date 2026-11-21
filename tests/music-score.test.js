// Piece 3c: bars, ties, clefs and MusicXML, against the Pi Notes prototype.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prototype, PI, piSeq, OVERRIDES_TEXT, SCHEME_CASES, clean, fromPrototype } from './music-equivalence.js';
import { parseOverrides } from '../public/src/mappings/music/overrides.js';
import { buildCountVoices, newStream, buildBar } from '../public/src/mappings/music/voices.js';
import { toMeasures, measuresInRange, exportBeats, chooseClef, decompose } from '../public/src/mappings/music/measures.js';
import { toMusicXML, padBars, xmlEscape, XML_DIVISIONS } from '../public/src/mappings/music/musicxml.js';
import { assertMusicXML } from './musicxml-checks.js';

const OCTS = [3, 2, 4, 1];
const overridesFor = (codeLen) => parseOverrides(OVERRIDES_TEXT, codeLen).map;
// The one intended difference from the prototype's output.
const asPrototypeWrote = (xml) => xml.replace('<software>Sonochrome</software>', '<software>Pi Notes</software>');

function scoreFor(bars, start) {
  return {
    title: 'Series <Notes> & "co"', subtitle: 'From position ' + start, bpm: 96,
    parts: bars.map((b, k) => ({ name: 'Inst ' + k, program: k + 1, clef: k === 1 ? 'bass' : 'treble', bars: b })),
  };
}

test('toMeasures and padBars match the prototype on Notes-mode voices', () => {
  for (const [scheme, codeLen] of SCHEME_CASES) for (const scale of ['Major', 'Blues', 'Chromatic']) for (const nv of [1, 3])
    for (const start of [0, 777, 19_000]) for (const count of [4, 24, 128]) for (const fixedLen of [0.5, 2]) {
      const s = { scheme, codeLen, fixedLen, range: 3, root: 5, scale, count, start };
      const { voices } = buildCountVoices(s, piSeq, overridesFor(codeLen), OCTS.slice(0, nv));
      const bars = voices.map((v) => toMeasures(v.events));
      assert.deepEqual(clean(bars), fromPrototype(voices.map((v) => prototype.toMeasures(v.events))), JSON.stringify(s));
      assert.deepEqual(clean(padBars(bars)), clean(prototype.padBars(bars)));
    }
});

test('measuresInRange matches the prototype on stream windows: full bars, pieces inside their events', () => {
  for (const [scheme, codeLen] of SCHEME_CASES) for (const nv of [1, 3]) {
    const s = { scheme, codeLen, fixedLen: 1, range: 2, root: 0, scale: 'Major', start: 50 };
    const st = newStream(s, OCTS.slice(0, nv)), evs = st.voices.map(() => []);
    for (let b = 0; b < 30; b++) buildBar(st, piSeq, overridesFor(codeLen)).events.forEach((l, k) => evs[k].push(...l));
    for (const [from, to, off] of [[0, 32, 0], [32, 64, 10], [40, 80, 7], [100, 132, 0]]) evs.forEach((list) => {
      const bars = measuresInRange(list, from, to, off);
      assert.deepEqual(clean(bars), clean(prototype.measuresInRange(list, from, to, off)));
      assert.equal(bars.length, (to - from) / 4);
      bars.forEach((bar) => assert.ok(Math.abs(bar.reduce((x, p) => x + p.beats, 0) - 4) < 1e-9, 'bar sums to 4'));
      let t = from;
      bars.flat().forEach((p) => {
        if (p.ei >= 0) {
          const e = list[p.ei - off];
          assert.ok(e.startBeat <= t + 1e-9 && t < e.startBeat + e.beats - 1e-9, 'piece inside its event');
        }
        t += p.beats;
      });
    });
  }
});

test('toMusicXML matches the prototype except for the <software> tag, and is a sound score', () => {
  let docs = 0;
  for (const [scheme, codeLen] of SCHEME_CASES) for (const scale of ['Major', 'Chromatic']) for (const nv of [1, 3]) for (const start of [0, 777]) {
    const s = { scheme, codeLen, fixedLen: 0.5, range: 3, root: 5, scale, count: 64, start };
    const { voices } = buildCountVoices(s, piSeq, overridesFor(codeLen), OCTS.slice(0, nv));
    const bars = padBars(voices.map((v) => toMeasures(v.events)));
    const score = scoreFor(bars, start);
    const xml = toMusicXML(score);
    assert.ok(xml.includes('<software>Sonochrome</software>'));
    assert.equal(asPrototypeWrote(xml), prototype.toMusicXML(score));
    assert.ok(xml.includes(xmlEscape(score.title)) && !xml.includes(score.title), 'title escaped');
    assertMusicXML(xml, bars);
    docs++;
  }
  assert.equal(docs, 48);
});

test('decompose, exportBeats and chooseClef', () => {
  assert.deepEqual(decompose(4), [4]);
  assert.deepEqual(decompose(3.75), [3, 0.75]);
  assert.deepEqual(decompose(1.25), [1, 0.25]);
  assert.equal(exportBeats(0), 4);
  assert.equal(exportBeats(4), 4);
  assert.equal(exportBeats(4.01), 8);
  assert.equal(exportBeats(13.7), 16);
  const ev = (...ms) => ms.map((m) => (m === null ? { rest: true, midi: null } : { rest: false, midi: m }));
  assert.equal(chooseClef(ev(40, 45), 'treble'), 'treble');
  assert.equal(chooseClef(ev(70, 72), 'bass'), 'bass');
  assert.equal(chooseClef(ev(50, 60, null), 'auto'), 'bass');
  assert.equal(chooseClef(ev(57, 57), 'auto'), 'treble');
  assert.equal(chooseClef(ev(null), 'auto'), 'treble');
  assert.equal(XML_DIVISIONS, 4);
});

test('with a key, the MusicXML carries its signature and spells pitches in it', async () => {
  const { keySignature } = await import('../public/src/mappings/music/keys.js');
  const s = { scheme: 'degrees', codeLen: 4, fixedLen: 1, range: 2, root: 4, scale: 'Major', count: 32, start: 0 };   // E major
  const { voices } = buildCountVoices(s, piSeq, {}, [4]);
  const bars = padBars(voices.map((v) => toMeasures(v.events)));
  const key = keySignature(4, 'Major');
  const xml = toMusicXML({ ...scoreFor(bars, 0), key });
  assert.match(xml, /<key><fifths>4<\/fifths><mode>major<\/mode><\/key>/);
  assert.match(xml, /<step>G<\/step><alter>1<\/alter>/);
  assert.doesNotMatch(xml, /<alter>-1<\/alter>/, 'no flats in E major');
  assertMusicXML(xml, bars);
  // G♭ major's C♭ sits in the octave of its letter: C♭5 is MIDI 71.
  const gb = toMusicXML({ ...scoreFor([[[{ ei: 0, rest: false, midi: 71, beats: 4, tie: false }]]], 0), key: keySignature(6, 'Major') });
  assert.match(gb, /<key><fifths>-6<\/fifths><mode>major<\/mode><\/key>/);
  assert.match(gb, /<pitch><step>C<\/step><alter>-1<\/alter><octave>5<\/octave><\/pitch>/);
});
