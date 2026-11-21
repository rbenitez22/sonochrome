/* A reader { pos, cur } is the only state of note generation: the next position to read and,
   for the "steps" scheme, the current scale position. Reading resumes from any reader. */
import { SCALES, midiName } from './theory.js';
import { chunkSize, decodeChunk } from './schemes.js';

export function newReader(s, pos) { return { pos, cur: Math.floor(SCALES[s.scale].length * s.range / 2) }; }

// Symbol values → one character each: 0-9, then a-z.
export function symbolString(values) { return values.map((v) => v.toString(36)).join(''); }

/* Read the next event and advance the reader, or return null when seq is too short.
   The event is { rest, midi, beats[, pinned], at, symbols, label }: `at` is the position of its
   first symbol and `symbols` the chunk it was read from. */
export function readEvent(s, seq, overrides, rd) {
  const chunk = chunkSize(s);
  if (rd.pos + chunk > seq.length) return null;
  const d = symbolString(seq.slice(rd.pos, rd.pos + chunk));
  const at = rd.pos;
  rd.pos += chunk;
  const e = decodeChunk(s, d, overrides, rd);
  e.at = at;
  e.symbols = d;
  e.label = e.rest ? 'rest' : midiName(e.midi);
  return e;
}
