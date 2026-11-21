// The Series panel's heading and the page's titles for the current source.
import { $ } from './dom.js';

export function showSeries(source) {
  document.title = source.name + ' · Sonochrome';
  $('seriesName').textContent = source.name;
  $('seriesTitle').textContent = source.name;
  $('seriesBlurb').textContent = source.blurb;
  $('bar').setAttribute('aria-label', 'Computing digits of ' + source.name);
}
