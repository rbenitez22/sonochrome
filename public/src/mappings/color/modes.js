/* Colour modes: how a cell's symbols become a colour. Each mode reads `dpc` symbols per cell.
   color(symbols, base) → [r, g, b], where symbols is a string with one character per symbol
   ('0'-'9', then 'a'-'z') and base the seq's alphabet size. accepts(seq) → true, or the reason the
   mode can't read that seq.
   The scaled modes divide by base^n − 1 (the largest n-symbol value), which for base 10 is exactly
   the prototype's 999 or 99; other bases still span the full range. Pure: no DOM. */
import { hexToRgb, hsl2rgb } from './convert.js';

const pal10 = ["#1b1b1b","#d62728","#ff7f0e","#f2c200","#2ca02c","#17becf","#1f77b4","#7b4fd0","#e377c2","#f4f4f4"];

// n symbols at position i, as a fraction of the largest n-symbol value in this base.
const scaled = (d, i, n, base) => parseInt(d.substr(i, n), base) / (base ** n - 1);

const anyDigitBase = (seq) => (seq.base !== null && seq.base >= 2) || 'needs a digit series';
const upToBase10 = (seq) => (seq.base !== null && seq.base <= 10) || 'needs a digit series in base 10 or lower';
const base10Only = (reason) => (seq) => seq.base === 10 || reason;

export const MODES = [
  { id: 'rgb3', name: "RGB · 9 digits (3 per channel)", dpc: 9, accepts: anyDigitBase,
    hint: "Each 3-digit group (000–999) is scaled to 0–255. Full color range.",
    color: (d, base) => [0,3,6].map(i => Math.round(scaled(d, i, 3, base) * 255)) },
  { id: 'rgb2', name: "RGB · 6 digits (2 per channel)", dpc: 6, accepts: anyDigitBase,
    hint: "Each 2-digit pair (00–99) is scaled to 0–255.",
    color: (d, base) => [0,2,4].map(i => Math.round(scaled(d, i, 2, base) * 255)) },
  { id: 'hex', name: "Hex · 6 digits literal (#123456)", dpc: 6, accepts: base10Only('reads decimal digits as a hex code'),
    hint: "The six digits are used as a hex code as-is. Only digits 0–9 appear, so every channel tops out at 0x99 and colors lean dark.",
    color: d => [0,2,4].map(i => parseInt(d.substr(i,2), 16)) },
  { id: 'hsl', name: "HSL · 7 digits (hue 3, sat 2, light 2)", dpc: 7, accepts: base10Only('takes its hue as 3 decimal digits mod 360'),
    hint: "Hue = first 3 digits mod 360, saturation and lightness 00–99 mapped to 20–100% and 20–80%.",
    color: d => { const h = (+d.substr(0,3)) % 360, s = 20 + +d.substr(3,2) / 99 * 80, l = 20 + +d.substr(5,2) / 99 * 60; return hsl2rgb(h, s, l); } },
  { id: 'gray', name: "Grayscale · 3 digits", dpc: 3, accepts: anyDigitBase,
    hint: "A 3-digit group (000–999) becomes a gray level.",
    color: (d, base) => { const v = Math.round(scaled(d, 0, 3, base) * 255); return [v, v, v]; } },
  { id: 'pal', name: "Digit palette · 1 digit per cell", dpc: 1, accepts: upToBase10,
    hint: "Each digit 0–9 maps to one of ten fixed colors, so you can read the digits straight off the image.",
    color: (d, base) => hexToRgb(pal10[parseInt(d, base)]) },
  { id: 'cmyk', name: "CMYK · 8 digits (2 per ink)", dpc: 8, accepts: anyDigitBase,
    hint: "Four 2-digit values (00–99) become C, M, Y, K percentages, then convert to RGB.",
    color: (d, base) => { const [c,m,y,k] = [0,2,4,6].map(i => scaled(d, i, 2, base)); return [255*(1-c)*(1-k), 255*(1-m)*(1-k), 255*(1-y)*(1-k)].map(Math.round); } },
];

export const modeById = (id) => MODES.find((m) => m.id === id) ?? null;
