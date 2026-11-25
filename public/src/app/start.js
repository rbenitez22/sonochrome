/* The start position, in the Series panel: the typed position, preset buttons, and random start.
   Shared by every view of a series (Music now, Colour later). Limits come from the source: presets
   and random ranges past its last position are hidden, and a larger start is clamped. The preset and
   range options stay in the markup, so Firefox can restore the form on reload. */
import { $, fmtN } from './dom.js';
import { parseStart, randomStart } from '../sources/position.js';

let maxStart = 0, lastStart = 0;

// The start position typed, validated against the source; shows an error for bad input.
export function readStart() {
  const v = parseStart($('start').value), err = $('startErr');
  if (v === null) { err.hidden = false; err.textContent = 'Enter a whole number, like 5000, 250,000 or 4M.'; return lastStart; }
  if (v > maxStart) { err.hidden = false; err.textContent = 'The largest start position is ' + fmtN(maxStart) + '.'; return (lastStart = maxStart); }
  err.hidden = true;
  return (lastStart = v);
}

// Fit the presets and random ranges to a source's last position.
export function setStartLimit(source) {
  maxStart = source.maxLength - 1;
  for (const b of $('presets').querySelectorAll('button')) b.hidden = +b.dataset.v > maxStart;
  const ranges = [...$('randomMax').options];
  ranges.forEach((o) => { o.hidden = o.disabled = +o.value > maxStart; });
  if ($('randomMax').selectedOptions[0]?.disabled) $('randomMax').value = ranges.filter((o) => !o.disabled).at(-1).value;
}

export function randomizeStart() {
  $('start').value = fmtN(randomStart(Math.min(+$('randomMax').value, maxStart)));
}

export const randomEachTime = () => $('randomEach').checked;

// onChange() runs whenever the start position changes (typed, preset or random).
export function initStart(onChange) {
  $('start').addEventListener('input', onChange);
  $('presets').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $('start').value = b.dataset.v;
    onChange();
  });
  $('randomBtn').addEventListener('click', () => { randomizeStart(); onChange(); });
}
