// Voices: events laid out in beats, for a whole piece (Notes mode) or one bar at a time (Time/Infinite).
// Each voice has its own octave; octs lists them, voice 1 first.
import { newReader, readEvent } from './reader.js';

/* "Notes" mode: voice 1 plays s.count events; each later voice reads the symbols after the
   previous one and fills the same number of beats (its last note is cut to fit).
   Returns { voices: [{ events, total }], nextPos }. */
export function buildCountVoices(s, seq, overrides, octs) {
  const voices = [];
  let pos = s.start, target = null;
  octs.forEach((oct, k) => {
    const vs = { ...s, oct }, rd = newReader(vs, pos), events = [];
    let b = 0;
    while (target == null ? events.length < s.count : b < target - 1e-9) {
      const e = readEvent(vs, seq, overrides, rd);
      if (!e) break;
      if (target != null && b + e.beats > target) e.beats = target - b;
      e.startBeat = b;
      b += e.beats;
      events.push(e);
    }
    voices.push({ events, total: b });
    if (k === 0) target = b;
    pos = rd.pos;
  });
  return { voices, nextPos: pos };
}

/* "Time"/"Infinite" modes: the piece is generated one 4/4 bar at a time.
   In each bar, voice 1 reads symbols until its notes reach the barline, then voice 2
   reads the following symbols, and so on. Notes may cross the barline (not cut); that
   voice simply starts later in the next bar. Only `limit` (total beats) cuts a note. */
export function newStream(s, octs) {
  return { pos: s.start, bar: 0, voices: octs.map((oct) => { const vs = { ...s, oct }; return { s: vs, rd: newReader(vs, s.start), end: 0 }; }) };
}

// Generate the next bar. Returns { events: [per-voice arrays], barEnd, done }, or null
// (stream unchanged) when seq does not have enough symbols yet.
export function buildBar(st, seq, overrides, limit = Infinity) {
  const barEnd = Math.min((st.bar + 1) * 4, limit);
  const snap = { pos: st.pos, vs: st.voices.map((v) => ({ end: v.end, pos: v.rd.pos, cur: v.rd.cur })) };
  const out = st.voices.map(() => []);
  for (let k = 0; k < st.voices.length; k++) {
    const v = st.voices[k];
    v.rd.pos = st.pos;
    while (v.end < barEnd - 1e-9) {
      const e = readEvent(v.s, seq, overrides, v.rd);
      if (!e) {
        st.pos = snap.pos;
        st.voices.forEach((w, i) => { w.end = snap.vs[i].end; w.rd.pos = snap.vs[i].pos; w.rd.cur = snap.vs[i].cur; });
        return null;
      }
      if (v.end + e.beats > limit) e.beats = limit - v.end;
      e.startBeat = v.end;
      v.end += e.beats;
      out[k].push(e);
    }
    st.pos = v.rd.pos;
  }
  st.bar++;
  return { events: out, barEnd, done: barEnd >= limit - 1e-9 };
}

// Time/Infinite: rebuild a streamed piece from its start up to `limit` beats (finite), as full
// per-voice event lists. Deterministic, so it matches what played. null if seq runs out.
export function regenerateVoices(s, seq, overrides, octs, limit) {
  const st = newStream(s, octs), evs = octs.map(() => []);
  for (;;) {
    const r = buildBar(st, seq, overrides, limit);
    if (!r) return null;
    r.events.forEach((list, k) => list.forEach((e) => evs[k].push(e)));
    if (r.done || r.barEnd >= limit - 1e-9) return evs;
  }
}
