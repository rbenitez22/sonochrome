/* Player routes live in the URL hash: "#<source id>" plus optional "?key=value" source params,
   e.g. "#pi" or "#pi?base=12". Param values stay strings; a source converts its own. */

// "#pi?base=12" → { id: 'pi', params: { base: '12' } }. An empty hash gives id ''.
export function parseRoute(hash) {
  const h = String(hash ?? '').replace(/^#/, '');
  const q = h.indexOf('?');
  let id = q < 0 ? h : h.slice(0, q);
  try { id = decodeURIComponent(id); } catch (e) {}
  return { id, params: Object.fromEntries(new URLSearchParams(q < 0 ? '' : h.slice(q + 1))) };
}

// ('pi', { base: 12 }) → "#pi?base=12".
export function formatRoute(id, params = {}) {
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  return '#' + encodeURIComponent(id) + (query ? '?' + query : '');
}

// The player page's link for a source.
export const playerHref = (id, params) => 'play.html' + formatRoute(id, params);
