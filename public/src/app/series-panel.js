// The Series panel's heading, its source params (e.g. the base) and the page's titles for the current source.
import { $ } from './dom.js';
import { unitWord, unitWords } from './unit.js';

// Names shown beside some bases.
const BASE_NAMES = { 2: 'binary', 8: 'octal', 10: 'decimal', 12: 'duodecimal', 16: 'hexadecimal' };
const choiceLabel = (param, v) => (param.id === 'base' && BASE_NAMES[v] ? `${v} (${BASE_NAMES[v]})` : String(v));

// A param's value from the route's params, or its default when missing or not one of its choices.
export function paramValue(param, params) {
  const v = params?.[param.id];
  return param.choices.some((c) => String(c) === String(v)) ? String(v) : String(param.default);
}

/* The params the route should carry: every param except those at their default, so the plain
   route stays "#pi". */
export function routeParams(source, params) {
  const out = {};
  for (const p of source.params) {
    const v = paramValue(p, params);
    if (v !== String(p.default)) out[p.id] = v;
  }
  return out;
}

// One select per source param; onChange(newParams) receives the params with the changed one.
function renderParams(source, params, onChange) {
  const box = $('seriesParams');
  box.innerHTML = '';
  box.hidden = !source.params.length;
  for (const p of source.params) {
    const field = document.createElement('div'), select = document.createElement('select');
    field.className = 'field';
    field.innerHTML = `<label for="param-${p.id}"></label>`;
    field.querySelector('label').textContent = p.label;
    select.id = 'param-' + p.id;
    for (const c of p.choices) {
      const o = document.createElement('option');
      o.value = String(c);
      o.textContent = choiceLabel(p, c);
      select.appendChild(o);
    }
    select.value = paramValue(p, params);
    select.addEventListener('change', () => onChange({ ...params, [p.id]: select.value }));
    field.appendChild(select);
    box.appendChild(field);
  }
}

export function showSeries(source, params, onParamsChange) {
  document.title = source.name + ' · Sonochrome';
  $('seriesName').textContent = source.name;
  $('seriesTitle').textContent = source.name;
  $('seriesBlurb').textContent = source.blurb;
  $('seriesUnits').textContent = unitWords(source);
  $('unitsTab').textContent = unitWords(source)[0].toUpperCase() + unitWords(source).slice(1);
  $('startLabel').textContent = 'Start at position (0 is the first ' + unitWord(source) + '). Type 4M, 250k or 4,000,000.';
  $('bar').setAttribute('aria-label', 'Computing ' + unitWords(source) + ' of ' + source.name);
  renderParams(source, params, onParamsChange);
}
