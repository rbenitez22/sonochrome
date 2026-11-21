// The scheme notes and colour-mode hints in every base: base 10 keeps the prototypes' text, and other
// bases name only digits that occur there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { schemeNote } from '../public/src/app/music/scheme-notes.js';
import { MODES, modeById } from '../public/src/mappings/color/modes.js';
import { BASES } from '../public/src/sources/constant.js';

// The Pi Notes prototype's own scheme notes.
function prototypeNotes() {
  const html = readFileSync(new URL('../prototypes/pi-notes.html', import.meta.url), 'utf8');
  const block = /const NOTES = (\{[\s\S]*?\n\});/.exec(html)[1];
  return new Function(`return ${block};`)();
}

test('base 10 notes are the prototype’s, word for word', () => {
  for (const [scheme, text] of Object.entries(prototypeNotes())) assert.equal(schemeNote(scheme, 10), text, scheme);
});

test('in bases 2 to 8 the digit schemes mention no digit the base lacks', () => {
  for (const base of BASES.filter((b) => b < 10)) for (const scheme of ['degrees', 'pairs', 'steps']) {
    const text = schemeNote(scheme, base).replace('seven-note', '').replace(`In base ${base}`, 'In this base');
    // Step counts ("go down 1 to 4") are not digits, so compare every number with the base.
    for (const n of text.match(/\d+/g).map(Number)) assert.ok(n < base || (scheme === 'steps' && n <= 4), `${scheme} base ${base}: ${n} in “${text}”`);
  }
  assert.equal(schemeNote('steps', 2), 'Each digit moves the melody from the previous note: 0 repeats, and 1 goes up one scale step.');
  assert.equal(schemeNote('steps', 7), 'Each digit moves the melody from the previous note: 0 repeats, 1 to 4 go up that many scale steps, and 5 and 6 go down 1 and 2.');
});

test('above base 10, degrees names the letter digits', () => {
  assert.match(schemeNote('degrees', 12), /the digits a and b are steps 10 and 11/);
  assert.match(schemeNote('degrees', 16), /the digits a to f are steps 10 to 15/);
});

test('integer schemes and base-10-only schemes keep their one text', () => {
  for (const scheme of ['values', 'intervals']) assert.equal(schemeNote(scheme, null), schemeNote(scheme, 10));
  assert.equal(schemeNote('codes', 7), schemeNote('codes', 10));
});

test('colour hints: base 10 is the prototype’s hint; other bases show their own ranges', () => {
  for (const m of MODES) assert.equal(m.hintFor(10), m.hint, m.id);
  for (const base of [2, 7, 12, 16]) {
    const top3 = (base - 1).toString(base).repeat(3), top2 = (base - 1).toString(base).repeat(2);
    assert.match(modeById('rgb3').hintFor(base), new RegExp(`000–${top3}`));
    assert.match(modeById('gray').hintFor(base), new RegExp(`000–${top3}`));
    assert.match(modeById('rgb2').hintFor(base), new RegExp(`00–${top2}`));
    assert.match(modeById('cmyk').hintFor(base), new RegExp(`00–${top2}`));
    for (const id of ['rgb3', 'rgb2', 'gray', 'cmyk']) assert.doesNotMatch(modeById(id).hintFor(base), /99/, `${id} base ${base}`);
  }
  assert.equal(modeById('pal').hintFor(2), 'Each digit 0–1 maps to one of 2 fixed colors, so you can read the digits straight off the image.');
  for (const id of ['wheel', 'shade']) assert.equal(modeById(id).hintFor(null), modeById(id).hint);
});
