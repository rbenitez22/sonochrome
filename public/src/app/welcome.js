/* The welcome page: one card per source in SOURCES, linking to its player. A card shows the source's
   glyph, name, description and its first PREVIEW symbols (only when the source has them without a
   noticeable wait). */
import { $ } from './dom.js';
import { SOURCES } from '../sources/index.js';
import { playerHref } from './route.js';
import { symbolString } from '../mappings/music/reader.js';

const PREVIEW = 32;

// The first PREVIEW symbols as text, or '' when the source can't give them quickly.
async function preview(source) {
  if ((source.quickLength ?? 0) < PREVIEW) return '';
  const seq = await source.prepare({}, PREVIEW);
  return symbolString(seq.slice(0, PREVIEW)) + '…';
}

// One card. The name is announced but not shown again when the glyph already is the name (π).
function card(source) {
  const a = document.createElement('a');
  a.className = 'card';
  a.href = playerHref(source.id);
  const glyph = source.glyph ?? source.name;
  const hideName = glyph === source.name ? ' class="visually-hidden"' : '';
  a.innerHTML = '<span class="sym" aria-hidden="true"></span><h2' + hideName + '></h2><p class="blurb"></p>' +
    '<p class="preview" aria-label="First digits"></p><span class="go">Hear it &rarr;</span>';
  a.querySelector('.sym').textContent = glyph;
  a.querySelector('h2').textContent = source.name;
  a.querySelector('.blurb').textContent = source.blurb;
  preview(source).then((text) => { a.querySelector('.preview').textContent = text; });
  return a;
}

$('cards').replaceChildren(...SOURCES.map(card));
