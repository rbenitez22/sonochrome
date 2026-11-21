/* The player's views (Music, Colour) as page-level tabs. Every element that belongs to one view carries
   data-view="<name>" and is shown only with it; the Series panel has none and is always shown.
   The tabs follow the ARIA tabs pattern; picking one calls onPick(name), which updates the route. */
import { $ } from './dom.js';
import { VIEWS } from './route.js';

// Show the parts of view `name` and hide the others; mark its tab selected.
export function showViewParts(name) {
  for (const el of document.querySelectorAll('[data-view]')) el.hidden = el.dataset.view !== name;
  for (const v of VIEWS) {
    const tab = $('view-' + v), on = v === name;
    tab.setAttribute('aria-selected', on);
    tab.tabIndex = on ? 0 : -1;
  }
}

export function initViewTabs(onPick) {
  $('viewTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[role="tab"]');
    if (b) onPick(b.dataset.pick);
  });
  $('viewTabs').addEventListener('keydown', (e) => {
    const i = VIEWS.indexOf(document.activeElement.dataset.pick);
    if (i < 0) return;
    const j = e.key === 'ArrowRight' ? (i + 1) % VIEWS.length : e.key === 'ArrowLeft' ? (i + VIEWS.length - 1) % VIEWS.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? VIEWS.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    onPick(VIEWS[j]);
    $('view-' + VIEWS[j]).focus();
  });
}
