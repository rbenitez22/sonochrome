// Test helper (not a test file): a small Standard MIDI File reader, written independently of the writer, to
// read exported files back. Handles running status, meta, sysex and channel events.

export function readMidi(bytes) {
  let i = 0;
  const u8 = () => bytes[i++];
  const u16 = () => (u8() << 8) | u8();
  const u32 = () => ((u8() << 24) >>> 0) + (u8() << 16) + (u8() << 8) + u8();
  const ascii = (n) => String.fromCharCode(...bytes.slice(i, (i += n)));
  const vlq = () => { let v = 0, b; do { b = u8(); v = v * 128 + (b & 0x7f); } while (b & 0x80); return v; };

  if (ascii(4) !== 'MThd') throw new Error('no MThd');
  if (u32() !== 6) throw new Error('bad header length');
  const format = u16(), ntrks = u16(), division = u16();
  const tracks = [];
  for (let t = 0; t < ntrks; t++) {
    if (ascii(4) !== 'MTrk') throw new Error('no MTrk at track ' + t);
    const length = u32(), end = i + length;   // read the length first: it moves i past itself
    const events = [];
    let tick = 0, status = 0;
    while (i < end) {
      tick += vlq();
      let b = bytes[i];
      if (b & 0x80) { status = b; i++; } // else running status
      if (status === 0xff) {
        const type = u8(), len = vlq();
        events.push({ tick, meta: type, data: [...bytes.slice(i, (i += len))] });
        if (type === 0x2f) break;
      } else if (status === 0xf0 || status === 0xf7) {
        i += vlq();
      } else {
        const kind = status & 0xf0, channel = status & 0x0f;
        const a = u8(), bb = kind === 0xc0 || kind === 0xd0 ? undefined : u8();
        events.push({ tick, kind, channel, a, b: bb });
      }
    }
    if (i !== end) throw new Error(`track ${t} length mismatch (${i} vs ${end})`);
    tracks.push(events);
  }
  if (i !== bytes.length) throw new Error('trailing bytes');
  return { format, division, tracks };
}

// A voice track's notes as { start, length, note } in ticks (a note-on with velocity 0 counts as off).
export function notesOf(track) {
  const open = new Map(), notes = [];
  for (const e of track) {
    if (e.kind === 0x90 && e.b > 0) {
      if (open.has(e.a)) throw new Error('note ' + e.a + ' on twice');
      open.set(e.a, e.tick);
    } else if (e.kind === 0x80 || (e.kind === 0x90 && e.b === 0)) {
      if (!open.has(e.a)) throw new Error('note ' + e.a + ' off without on');
      notes.push({ start: open.get(e.a), length: e.tick - open.get(e.a), note: e.a });
      open.delete(e.a);
    }
  }
  if (open.size) throw new Error('notes left on');
  return notes.sort((x, y) => x.start - y.start);
}
