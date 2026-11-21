// Playback length and how many symbols a piece needs (Time / Infinite / Notes modes).
import { chunkSize, symbolsPerBeat } from './schemes.js';

// Bounds for a typed playback length, in seconds (0:05 to 99:59).
export const DURATION_MIN = 5, DURATION_MAX = 99 * 60 + 59;

// "1:30" → 90, "90" → 90, "1:02:03" → 3723 seconds; null when not a time.
export function parseDuration(text) {
  const t = String(text).trim();
  if (!/^\d+(:\d{1,2}){0,2}$/.test(t)) return null;
  const parts = t.split(':').map(Number);
  if (parts.slice(1).some((p) => p > 59)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

// 75 → "1:15", 3723 → "1:02:03".
export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  const ss = String(s).padStart(2, '0');
  return h ? h + ':' + String(m).padStart(2, '0') + ':' + ss : m + ':' + ss;
}

// Seconds at a tempo → beats, on the sixteenth-note grid.
export function beatsForSeconds(sec, bpm) { return Math.max(0.25, Math.round(sec * bpm / 60 * 4) / 4); }

// Symbols to have ready (past the start) for nv voices to play `beats` beats, with 50% headroom.
export function streamSymbols(s, nv, beats) { return Math.ceil(beats * nv * symbolsPerBeat(s) * 1.5) + 300; }

// Notes mode: the position the seq must reach for nv voices of s.count events, with headroom.
export function symbolsNeeded(s, nv) {
  return s.start + nv * s.count * chunkSize(s) * 3 + 300;
}
