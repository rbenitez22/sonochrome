/* The music views as tabs, one shown at a time: Digits → notes, Piano roll, Sheet music.
   ARIA tabs pattern (arrow keys, Home, End); the choice is remembered in this browser. */
import { $ } from '../dom.js';

const TABS = ['digits', 'roll', 'sheet'];
const TAB_KEY = 'sonochrome.music-tab';
let onShown = () => {};

// Show one panel, hide the others, and remember the choice.
export function selectTab(name) {
  TABS.forEach((t) => {
    const on = t === name, btn = $('tab-' + t);
    btn.setAttribute('aria-selected', on);
    btn.tabIndex = on ? 0 : -1;
    $(t + 'Body').hidden = !on;
  });
  $('sheetTools').hidden = name !== 'sheet';
  try { localStorage.setItem(TAB_KEY, name); } catch (e) {}
  onShown(name);
}

// True when view `name`'s panel is on screen: its tab is open and the Music view itself is shown.
export const isShown = (name) => !$(name + 'Body').hidden && $(name + 'Body').offsetParent !== null;

// onTabShown(name) brings a newly shown view up to date (views are not drawn while hidden).
export function initTabs(onTabShown) {
  onShown = onTabShown;
  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('[role="tab"]'); if (b) selectTab(b.dataset.tab); });
  $('tabs').addEventListener('keydown', (e) => {
    const i = TABS.indexOf(document.activeElement.dataset.tab);
    if (i < 0) return;
    const j = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    selectTab(TABS[j]);
    $('tab-' + TABS[j]).focus();
  });
}

// Reopen the tab chosen last time, if it isn't the default.
export function restoreTab() {
  let saved = null;
  try { saved = localStorage.getItem(TAB_KEY); } catch (e) {}
  if (TABS.includes(saved) && saved !== 'digits') selectTab(saved);
}
