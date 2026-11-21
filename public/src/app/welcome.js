/* The welcome page: one card per source in SOURCES. A card shows the source's glyph, name, description
   and its first PREVIEW symbols (only when the source has them without a noticeable wait), and links
   to its player's two views: "Hear it" (Music) and "See it" (Colour). */
import { $ } from './dom.js';
import { SOURCES } from '../sources/index.js';
import { playerHref } from './route.js';
import { symbolString } from '../mappings/music/reader.js';

const PREVIEW = 32;

// The first PREVIEW symbols as text, or '' when the source can't give them quickly.
async function preview(source) {
  if ((source.quickLength ?? 0) < PREVIEW) return '';
  const seq = await source.prepare({}, PREVIEW);
  return symbolString(seq.slice(0, PREVIEW), seq.base) + '…';
}

// One card. The name is announced but not shown again when the glyph already is the name (π).
function card(source) {
  const el = document.createElement('article');
  el.className = 'card';
  const glyph = source.glyph ?? source.name;
  const hideName = glyph === source.name ? ' class="visually-hidden"' : '';
  el.innerHTML = '<span class="sym" aria-hidden="true"></span><h2' + hideName + '></h2><p class="blurb"></p>' +
    '<p class="preview" aria-label="First digits"></p>' +
    '<div class="go"><a class="hear">Hear it &rarr;</a><a class="see">See it &rarr;</a></div>';
  el.querySelector('.sym').textContent = glyph;
  el.querySelector('h2').textContent = source.name;
  el.querySelector('.blurb').textContent = source.blurb;
  const hear = el.querySelector('.hear'), see = el.querySelector('.see');
  hear.href = playerHref(source.id);
  see.href = playerHref(source.id, {}, 'color');
  hear.setAttribute('aria-label', 'Hear ' + source.name + ' as music');
  see.setAttribute('aria-label', 'See ' + source.name + ' as colour');
  preview(source).then((text) => { el.querySelector('.preview').textContent = text; });
  return el;
}

$('cards').replaceChildren(...SOURCES.map(card));
