// The progress bar shown while a source computes: percentage, stage label and elapsed seconds.
import { $ } from './dom.js';

export function showProgress(p, label, startedAt) {
  const pct = Math.round(p * 100);
  $('prog').hidden = false;
  $('fill').style.width = pct + '%';
  $('bar').setAttribute('aria-valuenow', pct);
  $('progText').textContent = label + ' ' + pct + '% · ' + Math.round((Date.now() - startedAt) / 1000) + ' s';
}

export function hideProgress() {
  $('prog').hidden = true;
}
