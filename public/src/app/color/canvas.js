// The Colour view's canvas: one square per cell, and finding the cell under the pointer.
import { $ } from '../dom.js';

// Browsers refuse canvases much larger than this many pixels on a side.
export const MAX_CANVAS_SIDE = 16000;
// Safari on iPhone and iPad refuses canvases over 4096 × 4096 pixels in area: drawing then does
// nothing, with no error. The same cap applies everywhere, so an image looks the same on every device.
export const MAX_CANVAS_AREA = 4096 * 4096;

// Pixels per cell for a w×h image asked at px: px, or less so the canvas stays within both limits.
export function cellPixels(w, h, px) {
  return Math.max(1, Math.min(px, Math.floor(MAX_CANVAS_SIDE / Math.max(w, h)), Math.floor(Math.sqrt(MAX_CANVAS_AREA / (w * h)))));
}

/* Draw image = { cells, w, h } at px screen pixels per cell (shrunk when the canvas would be too big).
   Returns the pixels per cell actually used. */
export function drawCells({ cells, w, h }, px) {
  const cv = $('cv');
  const eff = cellPixels(w, h, px);
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
