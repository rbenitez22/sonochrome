/* The Colour view's forms: the Colour card (mode with its hint, fill order, readout format) and the
   Image panel (size and pixel size, with preset pills). Reads them into image settings, clamping the
   numbers as the prototype did. */
import { $, fillSelect } from '../dom.js';
import { MODES, modeById } from '../../mappings/color/modes.js';

const PX_PRESETS = [1, 2, 4, 8, 10, 20, 32, 50];
const SIZE_PRESETS = [[4, 4], [8, 8], [16, 16], [32, 32], [64, 64], [100, 100], [16, 9], [40, 30]];
export const MAX_CELLS = 300, MAX_PX = 200;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// An integer field, clamped to [lo, hi] (dflt when not a number); the field shows the value used.
function readInt(id, lo, hi, dflt) {
  let v = parseInt($(id).value, 10);
  if (!isFinite(v)) v = dflt;
  v = clamp(v, lo, hi);
  $(id).value = v;
  return v;
}

// { mode, order, format, w, h, px } from the forms.
export function readImageSettings() {
  return {
    mode: modeById($('mode').value), order: $('order').value, format: $('fmt').value,
    w: readInt('w', 1, MAX_CELLS, 16), h: readInt('h', 1, MAX_CELLS, 16), px: readInt('px', 1, MAX_PX, 20),
  };
}

export const readoutFormat = () => $('fmt').value;

// Show the size the image was shrunk to.
export function showSize(w, h) { $('w').value = w; $('h').value = h; }

// The base of the current source's seq (null for an integer series), for the hints.
let base = 10;

export function showHint(mode) { $('modeHint').textContent = mode.hintFor(base); }

// Modes the source refuses are disabled, with the reason as a tooltip; a refused current mode gives
// way to the first accepted one. probe is any seq of the source (only its base matters).
export function setModesFor(source, probe) {
  base = probe.base;
  for (const o of $('mode').options) {
    const verdict = modeById(o.value).accepts(probe);
    o.disabled = verdict !== true;
    o.title = verdict === true ? '' : 'Not available for ' + source.name + ': it ' + verdict + '.';
  }
  if ($('mode').selectedOptions[0]?.disabled) $('mode').value = [...$('mode').options].find((o) => !o.disabled).value;
}

// Preset pills: pressed when they match the field(s); clicking one sets the field(s) and calls onPick.
function pills(id, items, current, apply, onPick) {
  const box = $(id);
  box.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = it.label;
    b.dataset.value = it.value;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { apply(it.value); onPick(); });
    box.appendChild(b);
  }
  box.current = current;
}

// Mark the pills that match the fields' values.
export function refreshPills() {
  for (const box of [$('pxPresets'), $('sizePresets')]) {
    for (const b of box.querySelectorAll('button')) b.setAttribute('aria-pressed', String(box.current() === b.dataset.value));
  }
}

/* handlers: { onChange() rebuilds the image, onFormatChange() redraws the readouts only }. */
export function initColorControls({ onChange, onFormatChange }) {
  fillSelect($('mode'), MODES.map((m) => [m.id, m.name]));
  pills('pxPresets', PX_PRESETS.map((v) => ({ label: v + 'px', value: String(v) })), () => String(+$('px').value),
    (v) => { $('px').value = v; }, onChange);
  pills('sizePresets', SIZE_PRESETS.map(([a, b]) => ({ label: a + '×' + b, value: a + 'x' + b })), () => $('w').value + 'x' + $('h').value,
    (v) => { const [a, b] = v.split('x'); $('w').value = a; $('h').value = b; }, onChange);
  ['mode', 'order'].forEach((id) => $(id).addEventListener('change', onChange));
  $('fmt').addEventListener('change', onFormatChange);
  ['px', 'w', 'h'].forEach((id) => {
    $(id).addEventListener('change', onChange);
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') onChange(); });
  });
}
