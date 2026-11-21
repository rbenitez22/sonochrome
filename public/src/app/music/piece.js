/* The piece the player shows and plays. Pure: no DOM, no audio.
   piece = { s, overrides, octs, voices, stream, totalBeats, nextPos }
   - s: settings ({ scheme, codeLen, fixedLen, range, root, scale, count, start, mode, durSec, bpm });
     mode is 'notes', 'time' or 'infinite'.
   - voices: one per instrument, { events, total, off, dropped }. Event indices are "logical": event i
     lives at events[i - off], so dropping played events (off grows) never renumbers the rest.
     dropped = the last position read by a dropped event (for the played range).
   - stream (Time/Infinite only, else null): { st (from newStream), limit, genEnd, done, out }.
     out = the seq ran short while generating; cleared when more symbols arrive. */
import { buildCountVoices, newStream, buildBar, regenerateVoices } from '../../mappings/music/voices.js';
import { exportBeats } from '../../mappings/music/measures.js';
import { symbolsPerBeat } from '../../mappings/music/schemes.js';
import { eventSpan } from '../../mappings/music/reader.js';
import { beatsForSeconds, streamSymbols, symbolsNeeded } from '../../mappings/music/timing.js';

// Bars generated before playback, as a preview (Time/Infinite).
export const PREVIEW_BARS = 8;
// Seconds of Infinite playback to have symbols for before starting.
export const INFINITE_AHEAD_SEC = 600;
// Events that ended more than this many beats ago may be dropped while streaming.
export const TRIM_BEHIND_BEATS = 64;
// Background refill: start when the symbols ahead cover less than atSec of playback; fetch aheadSec more.
export const REFILL = { atSec: 300, aheadSec: 1200 };

const newVoice = (events = [], total = 0) => ({ events, total, off: 0, dropped: -1 });
const lastPos = (e) => e.at + eventSpan(e) - 1;

// Total beats a Time piece lasts; Infinity for Infinite; null for Notes (set by the count).
export function limitBeats(s) {
  return s.mode === 'time' ? beatsForSeconds(s.durSec, s.bpm) : s.mode === 'infinite' ? Infinity : null;
}

// The position the seq must reach before playback can start, for nv voices.
export function symbolsFor(s, nv) {
  if (s.mode === 'notes') return symbolsNeeded(s, nv);
  const beats = s.mode === 'time' ? limitBeats(s) : beatsForSeconds(INFINITE_AHEAD_SEC, s.bpm);
  return s.start + streamSymbols(s, nv, beats);
}

// Notes mode: the whole piece up front.
export function notesPiece(s, seq, overrides, octs) {
  const built = buildCountVoices(s, seq, overrides, octs);
  const voices = built.voices.map((v) => newVoice(v.events, v.total));
  return { s, overrides, octs, voices, stream: null, totalBeats: Math.max(1, ...voices.map((v) => v.total)), nextPos: built.nextPos };
}

// Time/Infinite: start a stream and generate the first bars as a preview; playback continues it.
export function streamPiece(s, seq, overrides, octs) {
  const piece = {
    s, overrides, octs, voices: octs.map(() => newVoice()), totalBeats: 1, nextPos: s.start,
    stream: { st: newStream(s, octs), limit: limitBeats(s), genEnd: 0, done: false, out: false },
  };
  fillStream(piece, seq, PREVIEW_BARS * 4);
  piece.totalBeats = Math.max(1, piece.stream.genEnd);
  return piece;
}

// Generate bars until `untilBeat` is covered, the piece ends, or the seq runs short.
// Returns, per voice, { from: logical index of the first new event, events: the new events }.
export function fillStream(piece, seq, untilBeat) {
  const { voices, stream } = piece;
  const added = voices.map((vo) => ({ from: vo.off + vo.events.length, events: [] }));
  if (!stream) return added;
  while (!stream.done && !stream.out && stream.genEnd < untilBeat) {
    const r = buildBar(stream.st, seq, piece.overrides, stream.limit);
    if (!r) { stream.out = true; break; }
    r.events.forEach((list, k) => {
      const vo = voices[k];
      list.forEach((e) => { vo.events.push(e); added[k].events.push(e); });
      vo.total = stream.st.voices[k].end;
    });
    stream.genEnd = r.barEnd;
    if (r.done) stream.done = true;
  }
  piece.nextPos = stream.st.pos;
  return added;
}

/* Drop events that ended more than TRIM_BEHIND_BEATS before `beat`, keeping memory flat during long
   Infinite runs. keepFrom[k] is the first logical index voice k must keep (the playing or next
   unscheduled event). Returns, per voice, the logical indices dropped (for removing their chips). */
export function trimPlayed(piece, beat, keepFrom) {
  return piece.voices.map((vo, k) => {
    const gone = [];
    let n = 0;
    while (n < vo.events.length) {
      const e = vo.events[n], idx = vo.off + n;
      if (e.startBeat + e.beats >= beat - TRIM_BEHIND_BEATS || idx >= keepFrom[k]) break;
      vo.dropped = Math.max(vo.dropped, lastPos(e));
      gone.push(idx);
      n++;
    }
    if (n) { vo.events.splice(0, n); vo.off += n; }
    return gone;
  });
}

// Event i (logical index) of voice k, or undefined once dropped or not yet generated.
export function eventAt(piece, k, i) {
  const vo = piece.voices[k];
  return vo && vo.events[i - vo.off];
}

/* Full per-voice event lists to export: the voices as built (Notes), or regenerated (Time/Infinite),
   because streaming drops bars behind the playhead. Infinite exports the bars played so far.
   null when the seq is too short to regenerate. */
export function exportEvents(piece, seq, beatsPlayed) {
  if (!piece.stream) return piece.voices.map((vo) => vo.events);
  const limit = piece.s.mode === 'time' ? piece.stream.limit : exportBeats(beatsPlayed);
  return regenerateVoices(piece.s, seq, piece.overrides, piece.octs, limit);
}

// First and last position that per-voice event lists read.
export function symbolSpan(start, evs) {
  return { start, end: Math.max(start, ...evs.flatMap((list) => list.map(lastPos))) };
}

/* The positions a playback actually used: from the start to the last position of the last event that
   began by `beat`. null when nothing played. This is the record a history store can keep. */
export function playedRange(piece, beat) {
  let end = -1;
  piece.voices.forEach((vo) => {
    end = Math.max(end, vo.dropped);
    vo.events.forEach((e) => { if (e.startBeat <= beat) end = Math.max(end, lastPos(e)); });
  });
  return end < 0 ? null : { start: piece.s.start, end };
}

/* Background refill: the position to compute up to now, or 0 when no refill is due.
   Due when the symbols ahead of the generator cover less than REFILL.atSec of playback;
   the target covers REFILL.aheadSec more, never beyond `ceiling`. */
export function refillTarget(piece, have, ceiling) {
  const { s, stream, voices } = piece;
  if (!stream || stream.done || have >= ceiling) return 0;
  const rate = voices.length * symbolsPerBeat(s) * s.bpm / 60;
  if ((have - stream.st.pos) / rate > REFILL.atSec) return 0;
  const target = Math.min(ceiling, stream.st.pos + streamSymbols(s, voices.length, beatsForSeconds(REFILL.aheadSec, s.bpm)));
  return target > have ? target : 0;
}
