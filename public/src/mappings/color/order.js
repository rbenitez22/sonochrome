/* The order cells are filled in: an array of [x, y], one per cell of a w×h image. kind is
   "row" (rows, left to right), "snake" (boustrophedon), "col" (columns, top to bottom) or
   "spiral" (outwards from the centre). Pure: no DOM. */

export const ORDERS = [
  ['row', 'Rows, left to right'], ['snake', 'Snake (boustrophedon)'], ['col', 'Columns, top to bottom'], ['spiral', 'Spiral from center'],
];

export function cellOrder(w, h, kind) {
  const out = [];
  if (kind === "col") { for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) out.push([x, y]); }
  else if (kind === "snake") { for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) out.push([y % 2 ? w - 1 - i : i, y]); }
  else if (kind === "spiral") {
    let x = Math.floor((w - 1) / 2), y = Math.floor((h - 1) / 2), dx = 1, dy = 0, seg = 1, left = 1, turns = 0;
    // The spiral covers a square around the centre, so a long thin image needs about (2·max(w, h))² steps
    // (the prototype's limit of 8·w·h steps left cells out of shapes like 300×1).
    const total = w * h, limit = (2 * Math.max(w, h) + 2) ** 2; let guard = 0;
    while (out.length < total && guard++ < limit) {
      if (x >= 0 && x < w && y >= 0 && y < h) out.push([x, y]);
      x += dx; y += dy; left--;
      if (left === 0) { [dx, dy] = [-dy, dx]; turns++; if (turns % 2 === 0) seg++; left = seg; }
    }
  } else { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.push([x, y]); }
  return out;
}
