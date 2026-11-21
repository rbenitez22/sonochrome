/* Standard MIDI File export (format 1). Track 0 holds the title, tempo, time signature (4/4) and key
   signature; each voice then has a track with its name, a program change to its General MIDI program,
   and its notes as note-on/note-off pairs on its own channel (0, 1, 2, …; never 9, the drums).
   480 ticks per quarter note, so the sixteenth grid is exactly 120 ticks. Notes keep their full length
   (no tied pieces); rests are gaps. Pure: no DOM. */

export const TICKS_PER_QUARTER = 480;
const VELOCITY = 80;
const textBytes = (s) => [...new TextEncoder().encode(s)];

// A variable-length quantity: 7 bits per byte, most significant first, high bit set on all but the last.
export function vlq(n) {
  const out = [n % 128];
  for (n = Math.floor(n / 128); n > 0; n = Math.floor(n / 128)) out.unshift((n % 128) | 0x80);
  return out;
}

const u16 = (n) => [(n >> 8) & 0xff, n & 0xff];
const u32 = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const chunk = (type, data) => [...textBytes(type), ...u32(data.length), ...data];
const meta = (type, data) => [0xff, type, ...vlq(data.length), ...data];
const END_OF_TRACK = meta(0x2f, []);

// Track 0: title, tempo, 4/4, key signature.
function tempoTrack(title, bpm, key) {
  const usPerQuarter = Math.round(60_000_000 / bpm);
  return [
    0, ...meta(0x03, textBytes(title)),
    0, ...meta(0x51, [(usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff]),
    0, ...meta(0x58, [4, 2, 24, 8]),   // 4/4, 24 clocks a click, 8 thirty-seconds a quarter
    0, ...meta(0x59, [key.fifths & 0xff, key.mode === 'minor' ? 1 : 0]),
    0, ...END_OF_TRACK,
  ];
}

// One voice: name, program change, then its notes (offs before ons at the same tick).
function voiceTrack({ name, program, events }, channel) {
  const marks = [];
  for (const e of events) {
    if (e.rest) continue;
    const on = Math.round(e.startBeat * TICKS_PER_QUARTER), off = Math.round((e.startBeat + e.beats) * TICKS_PER_QUARTER);
    marks.push([on, 1, e.midi], [off, 0, e.midi]);
  }
  marks.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [0, ...meta(0x03, textBytes(name)), 0, 0xc0 | channel, (program - 1) & 0x7f];
  let tick = 0;
  for (const [t, isOn, note] of marks) {
    out.push(...vlq(t - tick), isOn ? 0x90 | channel : 0x80 | channel, note & 0x7f, isOn ? VELOCITY : 0x40);
    tick = t;
  }
  out.push(0, ...END_OF_TRACK);
  return out;
}

/* { title, bpm, key: { fifths, mode } (optional: C major), tracks: [{ name, program (1-based GM),
   events: [{ startBeat, beats, midi, rest }] }] } → the file's bytes. At most 9 voices (channels 0–8). */
export function toMidi({ title, bpm, key = { fifths: 0, mode: null }, tracks }) {
  if (tracks.length > 9) throw new RangeError('MIDI export supports up to 9 voices');
  const header = chunk('MThd', [...u16(1), ...u16(tracks.length + 1), ...u16(TICKS_PER_QUARTER)]);
  const body = [tempoTrack(title, bpm, key), ...tracks.map((t, k) => voiceTrack(t, k))].flatMap((data) => chunk('MTrk', data));
  return Uint8Array.from([...header, ...body]);
}
