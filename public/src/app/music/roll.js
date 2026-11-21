/* The piano roll: one bar per note on a canvas, coloured by voice, with the playing notes and the
   playhead in the hot colour. Notes mode shows the whole piece; while streaming, a window of
   ROLL_SPAN beats with the playhead a third of the way in. Colours come from the CSS theme. */
import { $ } from '../dom.js';

const ROLL_SPAN = 32;

// Beats shown: the whole piece in Notes mode; while streaming, a window around `at`.
function rollWindow(piece, at) {
  if (!piece || !piece.stream) return { from: 0, to: piece ? piece.totalBeats : 1 };
  const from = Math.max(0, at - ROLL_SPAN / 3);
  return { from, to: from + ROLL_SPAN };
}

// Lowest and highest pitch among the events that pass `keep`.
function pitchRange(voices, keep) {
  let lo = Infinity, hi = -Infinity;
  voices.forEach((vo) => vo.events.forEach((e) => { if (!e.rest && keep(e)) { lo = Math.min(lo, e.midi); hi = Math.max(hi, e.midi); } }));
  return lo <= hi ? [lo, hi] : [60, 72];
}

/* Draw the piece (or an empty roll when piece is null). cur[k] is voice k's playing event (logical
   index) or null when stopped; beatPos is the playhead, or -1 when stopped, in which case a stream
   stays where playback stopped (stoppedAt). */
export function drawRoll(piece, cur, beatPos, stoppedAt = 0) {
  const cv = $('roll'), dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight;
  if (!W) return;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d');
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement);
  const col = (n) => cs.getPropertyValue(n).trim();
  const hot = col('--hot'), line = col('--line'), muted = col('--muted');
  const voices = piece ? piece.voices : [];
  const { from, to } = rollWindow(piece, beatPos >= 0 ? beatPos : stoppedAt);
  const visible = (e) => e.startBeat + e.beats > from && e.startBeat < to;
  const [pMin, pMax] = pitchRange(voices, piece && piece.stream ? visible : () => true);
  const pad = 10, span = Math.max(pMax - pMin, 6);
  const nh = Math.max(3, Math.min(10, (H - 2 * pad) / (span + 1)));
  const xOf = (b) => (b - from) / (to - from) * W;
  g.strokeStyle = line; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = pad + i * (H - 2 * pad - nh) / 4 + nh / 2; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  voices.forEach((vo, k) => {
    const color = col('--v' + (k + 1));
    vo.events.forEach((e, j) => {
      if (!visible(e)) return;
      const x = xOf(e.startBeat), w = Math.max(2, e.beats / (to - from) * W - 1.5);
      if (e.rest) { g.fillStyle = muted; g.globalAlpha = 0.45; g.fillRect(x, H - pad - 3 - k * 4, w, 3); g.globalAlpha = 1; return; }
      const y = pad + (1 - (e.midi - pMin) / span) * (H - 2 * pad - nh);
      g.fillStyle = cur && cur[k] === vo.off + j ? hot : color;
      g.fillRect(x, y, w, nh);
    });
  });
  if (beatPos >= 0) { const x = xOf(beatPos); g.fillStyle = hot; g.fillRect(x - 1, 0, 2, H); }
}
