/* The Digits → notes view: one chip per event (its symbols, note and length), in one box per voice.
   Chips are keyed by the event's logical index (see piece.js), so they survive dropped events. */
import { $ } from '../dom.js';
import { fmtLen } from '../../mappings/music/theory.js';
import { spelledName } from '../../mappings/music/keys.js';

// fifths: the key signature the note names are spelled in (0: flats, as midiName).
let boxes = [], chips = [], fifths = 0;

function makeChip(e, box) {
  const c = document.createElement('div');
  c.className = 'chip' + (e.rest ? ' rest' : '') + (e.pinned ? ' pinned' : '');
  const label = e.rest ? 'rest' : spelledName(e.midi, fifths);
  c.innerHTML = '<span class="dg">' + e.symbols + '</span><span class="nt">' + label + '</span><span class="du">' + fmtLen(e.beats) + '</span>';
  box.appendChild(c);
  return c;
}

// All chips for the piece's voices; labelFor(k) names voice k when there are several. Note names are
// spelled in the key with `keyFifths` sharps or flats.
export function renderChips(voices, labelFor, keyFifths = 0) {
  fifths = keyFifths;
  const wrap = $('chipsWrap');
  wrap.innerHTML = '';
  boxes = [];
  chips = voices.map((vo, k) => {
    if (voices.length > 1) {
      const l = document.createElement('div'); l.className = 'vlabel';
      l.innerHTML = '<i style="background:var(--v' + (k + 1) + ')"></i>Instrument ' + (k + 1) + ': ' + labelFor(k);
      wrap.appendChild(l);
    }
    const box = document.createElement('div'); box.className = 'chips'; wrap.appendChild(box);
    boxes[k] = box;
    const m = new Map();
    vo.events.forEach((e, i) => m.set(vo.off + i, makeChip(e, box)));
    return m;
  });
}

export function clearChips() {
  $('chipsWrap').innerHTML = '';
  boxes = []; chips = [];
}

// Add chips for events generated during playback (`added` from fillStream).
export function appendChips(added) {
  added.forEach(({ from, events }, k) => {
    if (!boxes[k] || !chips[k]) return;
    events.forEach((e, j) => chips[k].set(from + j, makeChip(e, boxes[k])));
  });
}

// Remove the chips of dropped events (`gone` from trimPlayed).
export function removeChips(gone) {
  gone.forEach((list, k) => list.forEach((idx) => {
    const c = chips[k] && chips[k].get(idx);
    if (c) { c.remove(); chips[k].delete(idx); }
  }));
}

// Highlight (or un-highlight) the chip of voice k's event idx.
export function setChipOn(k, idx, on) {
  const c = idx >= 0 && chips[k] && chips[k].get(idx);
  if (c) c.classList.toggle('on', on);
}

// Scroll voice k's box so the chip of event idx is in the middle.
export function scrollChipIntoView(k, idx) {
  const c = idx >= 0 && chips[k] && chips[k].get(idx);
  if (!c) return;
  const box = c.parentNode;
  box.scrollTop = c.offsetTop - box.offsetTop - box.clientHeight / 2 + c.offsetHeight / 2;
}
