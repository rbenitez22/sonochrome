// Every series Sonochrome offers, in the order the welcome page lists them.
import pi from './pi.js';
import e from './e.js';
import sqrt2 from './sqrt2.js';
import phi from './phi.js';
import ln2 from './ln2.js';
import thueMorse from './thue-morse.js';
import fibonacciWord from './fibonacci-word.js';

export const SOURCES = [pi, e, sqrt2, phi, ln2, thueMorse, fibonacciWord];

export function sourceById(id) {
  return SOURCES.find((s) => s.id === id) ?? null;
}
