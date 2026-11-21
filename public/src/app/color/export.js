// Getting an image out of the Colour view: its colours as text, and the canvas as a PNG file.
import { $ } from '../dom.js';
import { formatColor } from '../../mappings/color/convert.js';

// Copy every cell's colour, in fill order, one per line. Resolves with a status message.
export async function copyColors({ cells, order, w }, format) {
  const text = order.map(([x, y]) => formatColor(cells[y * w + x].rgb, format)).join('\n');
  try { await navigator.clipboard.writeText(text); return `Copied ${order.length} colors.`; }
  catch (e) { return 'Copy was blocked here. Select from the list below instead.'; }
}

// Save the canvas as <name>.png. Resolves with a status message when it can't.
export function downloadPng(name) {
  return new Promise((resolve) => {
    try {
      $('cv').toBlob((blob) => {
        if (!blob) { resolve('Could not make the PNG. Right-click or long-press the image to save it.'); return; }
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = name + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve('');
      }, 'image/png');
    } catch (e) { resolve('Right-click or long-press the image to save it.'); }
  });
}
