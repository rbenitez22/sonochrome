// Test helper (not a test file): the prototype's `// <pure>` section from prototypes/pi-notes.html,
// loaded in a vm context, plus the π digits it reads, so tests can compare the modules against it.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { sourceById } from '../public/src/sources/index.js';

const NAMES = [
  'computePi', 'SCALES', 'parseOverrides', 'newReader', 'readEvent', 'buildCountVoices', 'newStream',
  'buildBar', 'regenerateVoices', 'toMeasures', 'measuresInRange', 'exportBeats', 'chooseClef',
  'toMusicXML', 'padBars', 'xmlEscape', 'parseDuration', 'fmtTime', 'beatsForSeconds',
  'digitsPerBeat', 'streamDigits', 'digitsNeeded', 'parseStart', 'randomStart', 'noteToMidi',
];

function loadPrototype() {
  const html = readFileSync(new URL('../prototypes/pi-notes.html', import.meta.url), 'utf8');
  const pure = html.slice(html.indexOf('// <pure>'), html.indexOf('// </pure>'));
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${pure};this.X={${NAMES.join(',')}}`, context);
  return context.X;
}

export const prototype = loadPrototype();
export const LENGTH = 20_000;
// The prototype's PI string and the π source's seq over the same digits.
export const PI = prototype.computePi(LENGTH);
export const piSeq = await sourceById('pi').prepare({}, LENGTH);
export const thueMorseSeq = await sourceById('thue-morse').prepare({}, LENGTH);

// Pinned codes used across the equivalence grids (the pi-notes test set).
export const OVERRIDES_TEXT = '3141 = C4 1/2\n1459 = rest 1/4\n2635 = Bb3 1/4\n26 = D5 3/4\n592 = rest 1/8';

// [scheme, codeLen] pairs the grids cover.
export const SCHEME_CASES = [['codes', 2], ['codes', 3], ['codes', 4], ['degrees', 4], ['pairs', 4], ['steps', 4]];

// Plain-data copy, so values from the vm context compare equal to ours.
export const clean = (x) => JSON.parse(JSON.stringify(x));

// A prototype event with its `digits` field renamed to `symbols`, the modules' name for it.
export function renameDigits(e) {
  if (!e) return e;
  const { digits, ...rest } = e;
  return { ...rest, symbols: digits };
}

// Any prototype result (voices, streams, bars) as plain data, with every `digits` key renamed to `symbols`.
export const fromPrototype = (x) => (x == null ? x : JSON.parse(JSON.stringify(x).replace(/"digits":/g, '"symbols":')));
