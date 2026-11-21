/* A reader { pos, cur[, prev] } is the only state of note generation: the next position to read, the
   current scale position (for "steps" and "intervals") and, once "intervals" has read a term, that term.
   Reading resumes from any reader. */
import { SCALES, midiName } from './theory.js';
import { chunkSize, decodeChunk } from './schemes.js';

export function newReader(s, pos) { return { pos, cur: Math.floor(SCALES[s.scale].length * s.range / 2) }; }

// Symbol values as text: one character each for a digit series (0-9, then a-z), or the integers
// separated by ", " for an integer series (base null).
export function symbolString(values, base) {
  return base === null ? values.join(', ') : values.map((v) => v.toString(36)).join('');
}

/* Read the next event and advance the reader, or return null when seq is too short.
   The event is { rest, midi, beats[, pinned], at, symbols, label[, span] }: `at` is the position of its
   first symbol and `symbols` the chunk it was read from, as text. Events of an integer series also carry
   `span`, the positions read (one term can be several characters, like "-3"); see eventSpan. */
export function readEvent(s, seq, overrides, rd) {
  const chunk = chunkSize(s);
  if (rd.pos + chunk > seq.length) return null;
  const d = symbolString(seq.slice(rd.pos, rd.pos + chunk), seq.base);
  const at = rd.pos;
  rd.pos += chunk;
  const e = decodeChunk(s, d, overrides, rd, seq.base ?? 10);
  e.at = at;
  e.symbols = d;
  e.label = e.rest ? 'rest' : midiName(e.midi);
  if (seq.base === null) e.span = chunk;
  return e;
}

// Positions an event read: its span for an integer series, else one per character of its symbols.
export const eventSpan = (e) => e.span ?? e.symbols.length;
