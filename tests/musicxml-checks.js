// Test helper (not a test file): structural checks on a MusicXML score, with no DOM.
// Shared by the π equivalence tests and the Thue–Morse run (3d), which has no prototype to compare with.
import assert from 'node:assert/strict';

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const tag = (s, t) => { const m = new RegExp('<' + t + '>([^<]*)</' + t + '>').exec(s); return m && m[1]; };

// Every opened tag is closed in order.
export function assertWellFormed(xml) {
  const stack = [];
  for (const m of xml.replace(/<\?[^>]*\?>|<!DOCTYPE[^>]*>/g, '').matchAll(/<(\/?)([\w-]+)[^>]*?(\/?)>/g)) {
    if (m[3]) continue;
    if (!m[1]) stack.push(m[2]);
    else assert.equal(stack.pop(), m[2], 'closing tag matches');
  }
  assert.equal(stack.length, 0, 'all tags closed');
}

// One part's measures: full bars, numbered in order, pitches round-trip, ties paired on equal pitches.
function assertPart(part, bars) {
  const measures = [...part.matchAll(/<measure number="(\d+)">([\s\S]*?)<\/measure>/g)];
  assert.equal(measures.length, bars.length, 'one measure per bar');
  const notes = bars.flat().filter((x) => !x.rest);
  let open = null, ni = 0;
  measures.forEach((m, mi) => {
    assert.equal(+m[1], mi + 1, 'measure numbering');
    const ns = [...m[2].matchAll(/<note>([\s\S]*?)<\/note>/g)].map((x) => x[1]);
    assert.equal(ns.reduce((t, n) => t + +tag(n, 'duration'), 0), 16, 'measure sums to 16 divisions');
    for (const n of ns) {
      if (n.includes('<rest')) { assert.ok(!n.includes('<tie'), 'rests are never tied'); continue; }
      const midi = STEP[tag(n, 'step')] + +(tag(n, 'alter') || 0) + 12 * (+tag(n, 'octave') + 1);
      assert.equal(midi, notes[ni++].midi, 'pitch round-trip');
      const stop = n.includes('<tie type="stop"/>'), start = n.includes('<tie type="start"/>');
      assert.equal(stop, open !== null, 'tie stop iff a tie is open');
      if (stop) assert.equal(midi, open, 'tie stops on the same pitch');
      assert.equal(n.includes('<tied type="start"/>'), start, 'tied start matches tie start');
      assert.equal(n.includes('<tied type="stop"/>'), stop, 'tied stop matches tie stop');
      open = start ? midi : null;
    }
  });
  assert.equal(open, null, 'no tie left open');
  assert.equal(ni, notes.length, 'every note exported');
}

// The whole score: well formed, one part and score-part per voice, each part sound.
export function assertMusicXML(xml, partsBars) {
  assertWellFormed(xml);
  const parts = [...xml.matchAll(/<part id="P\d+">([\s\S]*?)<\/part>/g)].map((m) => m[1]);
  assert.equal(parts.length, partsBars.length, 'one part per voice');
  assert.equal((xml.match(/<score-part /g) || []).length, partsBars.length, 'one score-part per voice');
  parts.forEach((p, k) => assertPart(p, partsBars[k]));
}
