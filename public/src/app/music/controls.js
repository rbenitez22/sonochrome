/* The music controls: the Length row and the Scheme and Sound forms. Reads and validates them into
   settings (with the start position from the Series panel, start.js), keeps the rows that apply to the
   current scheme and length mode visible, and keeps one list of pinned codes per code length.
   Calls handlers.onChange() whenever the piece must be rebuilt. */
import { $, fillSelect } from '../dom.js';
import { readStart } from '../start.js';
import { NAMES, SCALES } from '../../mappings/music/theory.js';
import { SCHEMES } from '../../mappings/music/schemes.js';
import { parseOverrides } from '../../mappings/music/overrides.js';
import { parseDuration, DURATION_MIN, DURATION_MAX } from '../../mappings/music/timing.js';
import { INSTRUMENTS, instrumentLabel } from './instruments.js';
import { schemeNote } from './scheme-notes.js';

const VDEF = [{ inst: 'piano', oct: 3 }, { inst: 'bass', oct: 2 }, { inst: 'bells', oct: 4 }, { inst: 'strings', oct: 3 }];
const PIN_EXAMPLES = { 2: '31 = C4 1/2\n41 = rest 1/4', 3: '314 = C4 1/2\n159 = rest 1/4', 4: '3141 = C4 1/2\n1459 = rest 1/4' };

const vstate = VDEF.map((v) => ({ ...v }));
// lastDur: the last valid duration; base: the current series' base (null for integers), for the scheme note.
let handlers = null, lastDur = 60, base = 10;
let pinLen = 4;
const pinsByLen = { 2: '', 3: '', 4: '' };

// ---- reading the form ----

function readDuration() {
  const v = parseDuration($('duration').value), err = $('durErr');
  if (v === null) { err.hidden = false; err.textContent = 'Enter a time like 1:30 or 90 (seconds).'; return lastDur; }
  if (v < DURATION_MIN || v > DURATION_MAX) { err.hidden = false; err.textContent = 'Use a time from 0:05 to 99:59.'; return (lastDur = Math.max(DURATION_MIN, Math.min(DURATION_MAX, v))); }
  err.hidden = true;
  return (lastDur = v);
}

// The settings the piece is built from (see piece.js).
export function readSettings() {
  return {
    scheme: $('scheme').value, codeLen: +$('codeLen').value, fixedLen: +$('fixedLen').value,
    range: +$('range').value, root: +$('key').value, scale: $('scale').value,
    count: Math.max(4, Math.min(128, +$('count').value || 24)),
    start: readStart(),
    mode: $('lenMode').value, durSec: readDuration(), bpm: +$('tempo').value
  };
}

// Pinned codes for the current code length; shows any parse errors.
export function readOverrides(s) {
  const ov = parseOverrides($('over').value, s.codeLen);
  $('overErr').hidden = !ov.errors.length;
  $('overErr').textContent = ov.errors.join(' | ');
  return ov.map;
}

export const voiceCount = () => +$('nv').value;
// Lowest octave per voice, voice 1 first.
export const octaves = () => vstate.slice(0, voiceCount()).map((v) => v.oct);
export const instrumentOf = (k) => vstate[k].inst;
export const voiceLabel = (k) => instrumentLabel(vstate[k].inst);
export const lastDuration = () => lastDur;
// The score's clef choice: 'auto', 'treble' or 'bass'.
export const clefSetting = () => $('clef').value;
// The score's key signature choice: 'auto' (from the Key and Scale) or 'none' (C, no signature).
export const keySigSetting = () => $('keySig').value;

// ---- rows that depend on other fields ----

export function showRows(s) {
  $('schemeNote').textContent = schemeNote(s.scheme, base);
  $('rowCodeLen').hidden = s.scheme !== 'codes';
  $('rowOver').hidden = s.scheme !== 'codes';
  $('rowLen').hidden = !['degrees', 'steps', 'values', 'intervals'].includes(s.scheme);
  $('rowRange').hidden = !['codes', 'steps', 'values', 'intervals'].includes(s.scheme);
  $('rowCount').hidden = s.mode !== 'notes';
  $('rowDuration').hidden = s.mode !== 'time';
}

function buildVoiceRows() {
  const nv = voiceCount(), box = $('voiceRows');
  box.innerHTML = '';
  for (let k = 0; k < nv; k++) {
    const a = document.createElement('div'); a.className = 'field';
    a.innerHTML = '<label for="inst' + k + '">Instrument ' + (k + 1) + '</label><select id="inst' + k + '">' +
      INSTRUMENTS.map((i) => '<option value="' + i[0] + '">' + i[1] + '</option>').join('') + '</select>';
    const b = document.createElement('div'); b.className = 'field';
    b.innerHTML = '<label for="oct' + k + '">Lowest octave ' + (k + 1) + '</label><select id="oct' + k + '">' +
      [1,2,3,4,5].map((o) => '<option>' + o + '</option>').join('') + '</select>';
    box.appendChild(a); box.appendChild(b);
    $('inst' + k).value = vstate[k].inst; $('oct' + k).value = vstate[k].oct;
    $('inst' + k).addEventListener('change', () => { vstate[k].inst = $('inst' + k).value; handlers.onChange(); });
    $('oct' + k).addEventListener('change', () => { vstate[k].oct = +$('oct' + k).value; handlers.onChange(); });
  }
}

/* Pinned codes: one list per code length (2, 3, 4 digits). The textbox shows the list for the
   current "Digits per code"; switching length saves it and loads the other list. */
function showPins() {
  $('over').value = pinsByLen[pinLen];
  $('over').placeholder = 'For example:\n' + PIN_EXAMPLES[pinLen];
  $('overLabel').textContent = 'Pinned ' + pinLen + '-digit codes (one per line: code = note or rest, then length)';
}
function switchPins() {
  pinsByLen[pinLen] = $('over').value;
  pinLen = +$('codeLen').value;
  showPins();
}
// Start from the length the browser shows: Firefox restores form values on reload, so it may not be 4.
// The restored text belongs to that length, except the 4-digit examples left over from an earlier mismatch.
function initPins() {
  pinsByLen[4] = $('over').defaultValue;
  pinLen = +$('codeLen').value;
  pinsByLen[pinLen] = pinLen !== 4 && $('over').value === $('over').defaultValue ? '' : $('over').value;
  showPins();
}

// ---- source-dependent choices ----

// Schemes the source refuses are disabled, with the reason as a tooltip; a refused current scheme
// gives way to the first accepted one. seq is any seq of the source (only its base matters).
export function setSchemesFor(source, seq) {
  base = seq.base;
  for (const o of $('scheme').options) {
    const verdict = SCHEMES.find((sc) => sc.id === o.value).accepts(seq);
    o.disabled = verdict !== true;
    o.title = verdict === true ? '' : 'Not available for ' + source.name + ': it ' + verdict + '.';
  }
  if ($('scheme').selectedOptions[0]?.disabled) $('scheme').value = [...$('scheme').options].find((o) => !o.disabled).value;
}

// ---- setup ----

/* handlers: { onChange() rebuilds the piece, onTempoInput() runs while the tempo slider moves,
   onTempoSettled() once it stops }. */
export function initControls(h) {
  handlers = h;
  fillSelect($('key'), NAMES.map((n, i) => [i, n]));
  fillSelect($('scale'), Object.keys(SCALES).map((k) => [k, k]));
  initPins();
  buildVoiceRows();
  $('codeLen').addEventListener('change', () => { switchPins(); h.onChange(); });
  ['scheme', 'fixedLen', 'range', 'key', 'scale', 'count', 'over', 'clef', 'keySig', 'lenMode', 'duration'].forEach((id) => {
    $(id).addEventListener(['over', 'count', 'duration'].includes(id) ? 'input' : 'change', h.onChange);
  });
  $('nv').addEventListener('change', () => { buildVoiceRows(); h.onChange(); });
  $('tempo').addEventListener('input', () => { $('tempoOut').textContent = $('tempo').value; h.onTempoInput(); });
  $('tempo').addEventListener('change', h.onTempoSettled);
}
