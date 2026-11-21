// The Colour view's text: the inspector readout, "Digits used" and "First 40 colours".
import { $ } from '../dom.js';
import { formatColor } from '../../mappings/color/convert.js';
import { symbolString } from '../../mappings/music/reader.js';

const LIST_LENGTH = 40, DIGITS_SHOWN = 600;
// units: 'digits' or 'terms' (see app/unit.js).
export function clearReadout(units = 'digits') {
  $('readout').innerHTML = `<span class="sw" style="background:transparent"></span><span>Hover or tap a cell to see its ${units} and color.</span>`;
}

// hit = { x, y, c } from cellAt; format is the readout format.
export function showReadout({ x, y, c }, format, units = 'digits') {
  $('readout').innerHTML = `<span class="sw" style="background:rgb(${c.rgb.join(',')})"></span><span>cell (${x}, ${y}) · ${units} <b>${c.symbols}</b> at position ${c.start}<br>${formatColor(c.rgb, format)}</span>`;
}

// The symbols the image reads, from start to end (exclusive), up to DIGITS_SHOWN of them.
export function showDigitsUsed(seq, start, end) {
  const shown = Math.min(end, start + DIGITS_SHOWN);
  $('digits').textContent = (start > 0 ? '…' : '') + symbolString(seq.slice(start, shown), seq.base) + (end > shown ? '… (' + (end - shown) + ' more)' : '');
}

// The first LIST_LENGTH cells in fill order: swatch, symbols, colour.
export function showColorList({ cells, order, w }, format) {
  const box = $('list');
  box.innerHTML = '';
  for (const [x, y] of order.slice(0, LIST_LENGTH)) {
    const c = cells[y * w + x], row = document.createElement('div');
    row.innerHTML = `<i style="background:rgb(${c.rgb.join(',')})"></i><span>${c.symbols}</span><span>→ ${formatColor(c.rgb, format)}</span>`;
    box.appendChild(row);
  }
}

export function clearLists() {
  $('digits').textContent = '';
  $('list').innerHTML = '';
}
