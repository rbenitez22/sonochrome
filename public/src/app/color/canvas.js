// The Colour view's canvas: one square per cell, and finding the cell under the pointer.
import { $ } from '../dom.js';

// Browsers refuse canvases much larger than this many pixels on a side.
const MAX_CANVAS = 16000;

/* Draw image = { cells, w, h } at px screen pixels per cell (shrunk when the canvas would be too big).
   Returns the pixels per cell actually used. */
export function drawCells({ cells, w, h }, px) {
  const cv = $('cv');
  const eff = Math.max(1, Math.min(px, Math.floor(MAX_CANVAS / Math.max(w, h))));
  cv.width = w * eff; cv.height = h * eff;
  const ctx = cv.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = cells[y * w + x].rgb;
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.fillRect(x * eff, y * eff, eff, eff);
  }
  cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px';
  return eff;
}

// Empty the canvas (nothing to show yet).
export function clearCanvas() {
  const cv = $('cv');
  cv.width = 0; cv.height = 0;
  cv.style.width = '0px'; cv.style.height = '0px';
}

// The cell under a mouse or touch event: { x, y, c }, or null outside the image.
export function cellAt(ev, { cells, w, h }) {
  const r = $('cv').getBoundingClientRect();
  const t = ev.touches ? ev.touches[0] : ev;
  const x = Math.floor((t.clientX - r.left) / r.width * w), y = Math.floor((t.clientY - r.top) / r.height * h);
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  return { x, y, c: cells[y * w + x] };
}
