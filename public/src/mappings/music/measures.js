// Notes laid out in 4/4 bars for the score and for export: splitting lengths, ties and clefs.

// Split a length (in beats) into printable note values.
export function decompose(x) {
  const out = [];
  for (const d of [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25]) {
    while (x >= d - 1e-9) { out.push(d); x -= d; }
  }
  return out;
}
// Cut events into 4/4 bars. Notes that cross a barline become tied pieces.
export function toMeasures(evs) {
  if (!evs.length) return [];
  const last = evs[evs.length - 1];
  return measuresInRange(evs, 0, Math.ceil((last.startBeat + last.beats) / 4 - 1e-9) * 4);
}
/* Cut the part of `evs` (contiguous, with startBeat) that lies in [fromBeat, toBeat) into
   4/4 bars. fromBeat/toBeat are on barlines. Notes crossing a barline inside the range become
   tied pieces; uncovered time becomes rests. ei = off + index in evs (-1 for filler rests). */
export function measuresInRange(evs, fromBeat, toBeat, off = 0) {
  const nBars = Math.round((toBeat - fromBeat) / 4);
  const bars = Array.from({ length: nBars }, () => []);
  const put = (a, b, mk) => {
    const out = [];
    while (b - a > 1e-9) {
      const bi = Math.floor((a - fromBeat) / 4 + 1e-9), barEnd = fromBeat + 4 * (bi + 1), take = Math.min(b, barEnd) - a;
      decompose(take).forEach((d) => { const p = mk(d); bars[bi].push(p); out.push(p); });
      a += take;
    }
    return out;
  };
  const rest = (d) => ({ ei: -1, rest: true, midi: null, beats: d, tie: false });
  let cur = fromBeat;
  evs.forEach((e, i) => {
    const a = Math.max(e.startBeat, fromBeat), b = Math.min(e.startBeat + e.beats, toBeat);
    if (b - a <= 1e-9) return;
    if (a - cur > 1e-9) put(cur, a, rest);
    const pieces = put(a, b, (d) => ({ ei: off + i, rest: e.rest, midi: e.midi, beats: d, tie: false }));
    if (!e.rest) pieces.forEach((p, j) => { p.tie = j < pieces.length - 1; });
    cur = b;
  });
  if (toBeat - cur > 1e-9) put(cur, toBeat, rest);
  return bars;
}
// Infinite export length: the played beats rounded up to the next barline (at least one bar).
export const exportBeats = (played) => Math.max(4, Math.ceil(played / 4 - 1e-9) * 4);
// Clef for a voice: the user's choice, or (auto) bass when the average pitch is below A3.
export function chooseClef(events, setting) {
  if (setting !== 'auto') return setting;
  const m = events.filter((e) => !e.rest).map((e) => e.midi);
  return m.length && m.reduce((a, b) => a + b, 0) / m.length < 57 ? 'bass' : 'treble';
}
