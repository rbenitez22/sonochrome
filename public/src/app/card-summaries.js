/* One-line summaries of the settings cards, shown in a collapsed card's heading on phones.
   Each reads the card's own fields as they are displayed; keyed by the card's class. */
import { $, fmtN } from './dom.js';

const picked = (id) => $(id).selectedOptions[0]?.textContent ?? '';
const join = (...parts) => parts.filter(Boolean).join(' · ');

// "π · base 12 · from 4M": the series, each param as its label and the first word of its choice, the start.
function series() {
  const params = [...$('seriesParams').querySelectorAll('.field')].map((f) =>
    f.querySelector('label').textContent.toLowerCase() + ' ' + (f.querySelector('select').selectedOptions[0]?.textContent.split(' ')[0] ?? ''));
  const start = $('start').value.trim() || '0';
  return join($('seriesTitle').textContent, ...params, 'from ' + (/^\d+$/.test(start) ? fmtN(Number(start)) : start));
}

function scheme() {
  return join(picked('scheme'), $('rowCodeLen').hidden ? '' : $('codeLen').value + ' digits per code');
}

function sound() {
  const nv = Number($('nv').value);
  return join(picked('key') + ' ' + picked('scale').toLowerCase(), nv + (nv === 1 ? ' instrument' : ' instruments'), $('tempo').value + ' BPM');
}

function colour() {
  return join(picked('mode'), picked('order'));
}

function image() {
  return join($('w').value + '×' + $('h').value + ' cells', $('px').value + ' px per cell');
}

export const SUMMARIES = {
  'series-panel': series,
  'scheme-card': scheme,
  'sound-card': sound,
  'color-options': colour,
  'image-card': image,
};
