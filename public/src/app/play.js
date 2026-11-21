/* The player page: the route, the source and its supply, the Series panel (heading, start position,
   computing with progress), and the Music | Colour views.
   The route in the hash names the source, its params and the view (see route.js); an unknown source
   sends the browser back to the welcome page. Each view is an object:
     { name, computeVerb, setSource(source, supply, probe), refresh(), show(), hide(), status(text) }
   where probe is a short seq of the source (enough to know its base). Only the active view is shown;
   show() refreshes it, so changes made while it was hidden (the start position) take effect. */
import { $ } from './dom.js';
import { sourceById } from '../sources/index.js';
import { parseRoute, formatRoute } from './route.js';
import { createSupply } from './supply.js';
import { showProgress, hideProgress } from './progress.js';
import { initStart, setStartLimit } from './start.js';
import { showSeries, routeParams } from './series-panel.js';
import { initViewTabs, showViewParts } from './views.js';
import { createMusicView } from './music/player.js';
import { createColorView } from './color/view.js';

let source = null, supply = null, active = null, computeTimer = 0;

/* Foreground compute up to `need`, with the Series panel's progress bar and Cancel. Resolves true once
   the positions are there, false when cancelled or failed (the active view's status says why). */
async function compute(need) {
  const triggers = document.querySelectorAll('.compute-trigger');
  triggers.forEach((b) => { b.disabled = true; });
  const startedAt = Date.now();
  let p = 0, label = 'Starting';
  showProgress(p, label, startedAt);
  computeTimer = setInterval(() => showProgress(p, label, startedAt), 500);
  try {
    await supply.compute(need, (pp, l) => { p = pp; label = l; showProgress(p, label, startedAt); });
    return true;
  } catch (e) {
    if (e?.name !== 'AbortError') active.status('Could not compute the digits: ' + (e?.message ?? e));
    return false;
  } finally {
    clearInterval(computeTimer);
    hideProgress();
    triggers.forEach((b) => { b.disabled = false; });
  }
}

const page = { compute };
const views = { music: createMusicView(page), color: createColorView(page) };

async function useSource(next, params) {
  active?.hide();
  supply?.cancel();
  supply?.stopRefill();
  source = next;
  supply = createSupply(source, routeParams(source, params));
  showSeries(source, supply.params, (changed) => { location.hash = formatRoute(source.id, routeParams(source, changed), active.name); });
  setStartLimit(source);
  const probe = await supply.ready(1);
  for (const view of Object.values(views)) view.setSource(source, supply, probe);
}

function selectView(name) {
  active = views[name];
  showViewParts(name);
  active.show();
}

const sameParams = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Follow the route: a new source or params reloads the source; then show the routed view.
async function onRoute() {
  const route = parseRoute(location.hash);
  const next = sourceById(route.id);
  if (!next) { location.replace('index.html'); return; }
  if (next !== source || !sameParams(routeParams(next, route.params), supply.params)) await useSource(next, route.params);
  else if (active && active.name !== route.view) active.hide();
  else if (active) return;
  selectView(route.view);
}

window.addEventListener('hashchange', onRoute);
initViewTabs((name) => { location.hash = formatRoute(source.id, supply.params, name); });
initStart(() => active?.refresh());
$('cancel').addEventListener('click', () => {
  supply.cancel();
  active.status('Cancelled. Press ' + active.computeVerb + ' to try again, or pick a smaller start position.');
});
await onRoute();
