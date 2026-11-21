// Every series Sonochrome offers, in the order the welcome page lists them.
import pi from './pi.js';
import thueMorse from './thue-morse.js';

export const SOURCES = [pi, thueMorse];

export function sourceById(id) {
  return SOURCES.find((s) => s.id === id) ?? null;
}
