// Colour conversions and readout formats for the colour view. Pure: no DOM.

// "#rrggbb" → [r, g, b]; h, s, l (degrees, percent, percent) → [r, g, b]; [r, g, b] → [h, s, l].
export function hexToRgb(h) { return [1,3,5].map(i => parseInt(h.substr(i,2), 16)); }
export function hsl2rgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map(v => Math.round(v * 255));
}
export function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2*l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
const hx = n => n.toString(16).padStart(2, "0");
// [r, g, b] → text in one readout format: "hex" (#rrggbb), "rgb", "hsl" or "dec" (0xRRGGBB as an integer).
export function formatColor(rgb, kind) {
  const [r,g,b] = rgb;
  if (kind === "rgb") return `rgb(${r}, ${g}, ${b})`;
  if (kind === "hsl") { const [h,s,l] = rgb2hsl(r,g,b); return `hsl(${h}, ${s}%, ${l}%)`; }
  if (kind === "dec") return String((r << 16) | (g << 8) | b);
  return "#" + hx(r) + hx(g) + hx(b);
}
