/* An image from a seq: w×h cells, each reading `mode.dpc` symbols, filled in a chosen order from
   position `start`. Pure: no DOM. */
import { symbolString } from '../music/reader.js';
import { cellOrder } from './order.js';

// The smallest and largest of some values.
function valueRange(values) {
  let min = Infinity, max = -Infinity;
  for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
  return { min, max };
}

// Positions an image reads: from start up to (not including) this one.
export const symbolsNeeded = (start, w, h, dpc) => start + w * h * dpc;

/* Shrink w×h so the image fits in the positions before `limit` (the source's maxLength): height first,
   keeping the width, then width. Returns { w, h, reduced }. */
export function fitSize(w, h, dpc, start, limit) {
  const room = limit - start;
  if (w * h * dpc <= room) return { w, h, reduced: false };
  const cap = Math.max(1, Math.floor(room / dpc));
  h = Math.max(1, Math.floor(cap / w));
  if (h * w * dpc > room) w = Math.max(1, Math.floor(cap / h));
  return { w, h, reduced: true };
}

/* The cells of the image, row-major (cells[y * w + x]), each { start, symbols, rgb }, plus the fill
   order ([x, y] per cell, in reading order). The seq must reach symbolsNeeded(start, w, h, mode.dpc). */
export function buildCells(seq, start, w, h, mode, orderKind) {
  const order = cellOrder(w, h, orderKind);
  const cells = new Array(w * h);
  const range = mode.needsRange ? valueRange(seq.slice(start, start + w * h * mode.dpc)) : undefined;
  order.forEach(([x, y], i) => {
    const at = start + i * mode.dpc;
    const symbols = symbolString(seq.slice(at, at + mode.dpc), seq.base);
    cells[y * w + x] = { start: at, symbols, rgb: mode.color(symbols, seq.base, range) };
  });
  return { cells, order };
}
