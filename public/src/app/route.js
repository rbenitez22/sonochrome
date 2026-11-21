/* Player routes live in the URL hash: "#<source id>[/<view>][?key=value…]". The view is "music"
   (the default, left out of the hash) or "color"; the params belong to the source, e.g. "#pi?base=12"
   or "#pi/color". Param values stay strings; a source converts its own. */

export const VIEWS = ['music', 'color'];
const DEFAULT_VIEW = 'music';

// "#pi/color?base=12" → { id: 'pi', view: 'color', params: { base: '12' } }. An unknown view is
// read as the default; an empty hash gives id ''.
export function parseRoute(hash) {
  const h = String(hash ?? '').replace(/^#/, '');
  const q = h.indexOf('?');
  const path = q < 0 ? h : h.slice(0, q);
  const slash = path.indexOf('/');
  let id = slash < 0 ? path : path.slice(0, slash);
  try { id = decodeURIComponent(id); } catch (e) {}
  const view = slash < 0 ? DEFAULT_VIEW : path.slice(slash + 1);
  return {
    id,
    view: VIEWS.includes(view) ? view : DEFAULT_VIEW,
    params: Object.fromEntries(new URLSearchParams(q < 0 ? '' : h.slice(q + 1))),
  };
}

// ('pi', { base: 12 }, 'color') → "#pi/color?base=12".
export function formatRoute(id, params = {}, view = DEFAULT_VIEW) {
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  return '#' + encodeURIComponent(id) + (view === DEFAULT_VIEW ? '' : '/' + view) + (query ? '?' + query : '');
}

// The player page's link for a source and view.
export const playerHref = (id, params, view) => 'play.html' + formatRoute(id, params, view);
