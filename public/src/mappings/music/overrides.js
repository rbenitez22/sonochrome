// Pinned codes for the "codes" scheme: lines like "2635 = Bb3 1/4" or "1459 = rest".
import { noteToMidi, quant } from './theory.js';

// text → { map: { code: { rest, midi, beats } }, errors: [message] }. Codes must be codeLen symbols long.
export function parseOverrides(text, codeLen) {
  const map = {}, errors = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const m = /^(\d+)\s*=\s*(rest|[A-Ga-g][#b]?-?\d)\s*(\d+(?:\/\d+)?)?$/i.exec(line);
    if (!m) { errors.push('Line ' + (i + 1) + ': use  code = note|rest [length], e.g. 2635 = Bb3 1/4'); return; }
    if (m[1].length !== codeLen) { errors.push('Line ' + (i + 1) + ': ' + m[1] + ' is not ' + codeLen + ' digits, so it is ignored'); return; }
    let beats = 1;
    if (m[3]) {
      const [a, b] = m[3].split('/').map(Number);
      beats = (b ? a / b : a) * 4;
      if (!(beats >= 0.125 && beats <= 16)) { errors.push('Line ' + (i + 1) + ': length out of range'); return; }
    }
    const isRest = m[2].toLowerCase() === 'rest';
    const midi = isRest ? null : noteToMidi(m[2]);
    if (!isRest && midi === null) { errors.push('Line ' + (i + 1) + ': unknown note ' + m[2]); return; }
    map[m[1]] = { rest: isRest, midi, beats: quant(beats) };
  });
  return { map, errors };
}
