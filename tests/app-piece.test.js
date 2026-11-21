// Piece 4a: the player's piece state (app/music/piece.js), pure, against the music core.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceById } from '../public/src/sources/index.js';
import { digitStringSeq } from '../public/src/sources/seq.js';
import { symbolString } from '../public/src/mappings/music/reader.js';
import { buildCountVoices, regenerateVoices } from '../public/src/mappings/music/voices.js';
import { exportBeats } from '../public/src/mappings/music/measures.js';
import { symbolsNeeded } from '../public/src/mappings/music/timing.js';
import {
  notesPiece, streamPiece, fillStream, trimPlayed, eventAt, exportEvents, playedRange, symbolSpan,
  limitBeats, symbolsFor, refillTarget, PREVIEW_BARS, TRIM_BEHIND_BEATS,
} from '../public/src/app/music/piece.js';

const pi = await sourceById('pi').prepare({}, 20_000);
const tm = await sourceById('thue-morse').prepare({}, 20_000);
const OCTS = [3, 2, 4];
const settings = (over = {}) => ({
  scheme: 'codes', codeLen: 4, fixedLen: 1, range: 2, root: 0, scale: 'Major', count: 24, start: 100,
  mode: 'notes', durSec: 60, bpm: 120, ...over,
});
const allEvents = (piece) => piece.voices.map((vo) => vo.events);

test('notesPiece holds the core’s Notes-mode voices, with logical indices from 0', () => {
  const s = settings();
  const piece = notesPiece(s, pi, {}, OCTS);
  const built = buildCountVoices(s, pi, {}, OCTS);
  assert.deepEqual(allEvents(piece), built.voices.map((v) => v.events));
  assert.equal(piece.nextPos, built.nextPos);
  assert.equal(piece.totalBeats, Math.max(...built.voices.map((v) => v.total)));
  assert.equal(piece.stream, null);
  piece.voices.forEach((vo) => assert.deepEqual([vo.off, vo.dropped], [0, -1]));
  assert.equal(eventAt(piece, 1, 2), piece.voices[1].events[2]);
});

for (const [name, seq, scheme] of [['π', pi, 'codes'], ['Thue–Morse', tm, 'steps']]) {
  test(`${name}: a stream preview is ${PREVIEW_BARS} bars, and filling on equals regenerating`, () => {
    const s = settings({ mode: 'time', durSec: 90, scheme });
    const piece = streamPiece(s, seq, {}, OCTS);
    assert.equal(piece.stream.genEnd, PREVIEW_BARS * 4);
    assert.equal(piece.totalBeats, PREVIEW_BARS * 4);
    assert.equal(piece.stream.limit, limitBeats(s));
    const added = fillStream(piece, seq, 100);
    added.forEach((a, k) => assert.equal(a.from + a.events.length, piece.voices[k].events.length));
    fillStream(piece, seq, Infinity);
    assert.ok(piece.stream.done);
    assert.equal(piece.nextPos, piece.stream.st.pos);
    assert.deepEqual(allEvents(piece), regenerateVoices(s, seq, {}, OCTS, piece.stream.limit));
  });
}

test('a stream that runs out of symbols marks itself out and stops', () => {
  const short = digitStringSeq(symbolString(pi.slice(0, 160)), 10);
  const piece = streamPiece(settings({ mode: 'infinite' }), short, {}, OCTS);
  assert.ok(piece.stream.out);
  assert.ok(piece.stream.genEnd < PREVIEW_BARS * 4);
  const before = piece.voices.map((vo) => vo.events.length);
  fillStream(piece, short, 1000);
  assert.deepEqual(piece.voices.map((vo) => vo.events.length), before, 'no more bars while out');
});

test('trimPlayed drops old events but keeps logical indices, the played range and the export', () => {
  const s = settings({ mode: 'infinite' });
  const piece = streamPiece(s, pi, {}, OCTS);
  fillStream(piece, pi, 240);
  const byIndex = piece.voices.map((vo) => vo.events.map((e, i) => [i, e]));
  const beat = 200, rangeBefore = playedRange(piece, beat);
  const exportBefore = exportEvents(piece, pi, beat);

  const keepFrom = piece.voices.map((vo) => vo.events.length);
  const gone = trimPlayed(piece, beat, keepFrom);
  gone.forEach((list, k) => {
    assert.ok(list.length > 0, 'something was dropped');
    assert.deepEqual(list, list.map((_, j) => j), 'the oldest events go first');
    assert.equal(piece.voices[k].off, list.length);
  });
  byIndex.forEach((pairs, k) => pairs.forEach(([i, e]) => {
    if (i >= piece.voices[k].off) assert.equal(eventAt(piece, k, i), e, 'logical index still finds its event');
    else assert.equal(eventAt(piece, k, i), undefined);
  }));
  piece.voices.forEach((vo) => vo.events.forEach((e) => assert.ok(e.startBeat + e.beats >= beat - TRIM_BEHIND_BEATS)));
  assert.deepEqual(playedRange(piece, beat), rangeBefore);
  assert.deepEqual(exportEvents(piece, pi, beat), exportBefore);
});

test('trimPlayed never drops the playing or unscheduled events', () => {
  const piece = streamPiece(settings({ mode: 'infinite' }), pi, {}, OCTS);
  fillStream(piece, pi, 240);
  const gone = trimPlayed(piece, 200, [3, 0, 5]);
  assert.deepEqual(gone.map((l) => l.length), [3, 0, 5]);
});

test('exportEvents: Notes gives the voices, Time the whole piece, Infinite the bars played so far', () => {
  const notes = notesPiece(settings(), pi, {}, OCTS);
  assert.deepEqual(exportEvents(notes, pi, 0), allEvents(notes));
  const s = settings({ mode: 'time', durSec: 20 });
  const time = streamPiece(s, pi, {}, OCTS);
  assert.deepEqual(exportEvents(time, pi, 3), regenerateVoices(s, pi, {}, OCTS, limitBeats(s)));
  const inf = settings({ mode: 'infinite' });
  const infinite = streamPiece(inf, pi, {}, OCTS);
  assert.deepEqual(exportEvents(infinite, pi, 13.7), regenerateVoices(inf, pi, {}, OCTS, exportBeats(13.7)));
  assert.equal(exportEvents(infinite, digitStringSeq('31', 10), 13.7), null);
});

test('playedRange and symbolSpan', () => {
  const piece = notesPiece(settings(), pi, {}, OCTS);
  assert.equal(playedRange(piece, -1), null);
  const first = piece.voices.map((vo) => vo.events[0]);
  const end = Math.max(...first.map((e) => e.at + e.symbols.length - 1));
  assert.deepEqual(playedRange(piece, 0), { start: 100, end });
  const span = symbolSpan(100, allEvents(piece));
  assert.equal(span.end, piece.nextPos - 1);
});

test('symbolsFor: Notes uses symbolsNeeded; Time and Infinite reach past the start', () => {
  const s = settings();
  assert.equal(symbolsFor(s, 2), symbolsNeeded(s, 2));
  assert.ok(symbolsFor(settings({ mode: 'time', durSec: 60 }), 2) > 100);
  assert.ok(symbolsFor(settings({ mode: 'infinite' }), 2) > symbolsFor(settings({ mode: 'time', durSec: 60 }), 2));
  assert.equal(limitBeats(settings()), null);
  assert.equal(limitBeats(settings({ mode: 'infinite' })), Infinity);
});

test('refillTarget: due only when the buffer runs low, capped at the ceiling', () => {
  const piece = streamPiece(settings({ mode: 'infinite' }), pi, {}, OCTS);
  const pos = piece.stream.st.pos;
  assert.equal(refillTarget(piece, pos + 1_000_000, 20_000_000), 0, 'plenty ahead');
  const target = refillTarget(piece, pos + 50, 20_000_000);
  assert.ok(target > pos + 50, 'low buffer: refill');
  assert.equal(refillTarget(piece, pos + 50, pos + 60), pos + 60, 'capped at the ceiling');
  assert.equal(refillTarget(piece, 20_000_000, 20_000_000), 0, 'at the ceiling');
  assert.equal(refillTarget(notesPiece(settings(), pi, {}, OCTS), 0, 1e6), 0, 'Notes mode never refills');
});
