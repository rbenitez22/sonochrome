// Piece 5a: player routes in the URL hash (app/route.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, formatRoute, playerHref } from '../public/src/app/route.js';
import { SOURCES, sourceById } from '../public/src/sources/index.js';

test('parseRoute reads the source id, the view and the params', () => {
  assert.deepEqual(parseRoute('#pi'), { id: 'pi', view: 'music', params: {} });
  assert.deepEqual(parseRoute('#pi?base=12&x=a%20b'), { id: 'pi', view: 'music', params: { base: '12', x: 'a b' } });
  assert.deepEqual(parseRoute('thue-morse'), { id: 'thue-morse', view: 'music', params: {} });
  assert.deepEqual(parseRoute('#pi/color?base=12'), { id: 'pi', view: 'color', params: { base: '12' } });
  assert.deepEqual(parseRoute('#pi/nonsense'), { id: 'pi', view: 'music', params: {} }, 'an unknown view falls back to music');
  for (const empty of ['', '#', undefined, null]) assert.deepEqual(parseRoute(empty), { id: '', view: 'music', params: {} });
  assert.equal(parseRoute('#%E0%A4%A').id, '%E0%A4%A', 'a malformed escape is kept as typed');
});

test('formatRoute and parseRoute round-trip', () => {
  for (const [id, params, view] of [['pi', {}, 'music'], ['pi', { base: 12 }, 'color'], ['thue-morse', { a: 'x y', b: '&?' }, 'color']]) {
    const back = parseRoute(formatRoute(id, params, view));
    assert.equal(back.id, id);
    assert.equal(back.view, view);
    assert.deepEqual(back.params, Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
  }
  assert.equal(formatRoute('pi', { base: 12 }), '#pi?base=12');
  assert.equal(formatRoute('pi', {}, 'music'), '#pi', 'the default view stays out of the hash');
  assert.equal(formatRoute('pi', {}, 'color'), '#pi/color');
});

test('every source has a player link that routes back to it', () => {
  for (const s of SOURCES) {
    for (const view of ['music', 'color']) {
      const href = playerHref(s.id, {}, view), route = parseRoute(href.slice(href.indexOf('#')));
      assert.match(href, /^play\.html#/);
      assert.equal(sourceById(route.id), s);
      assert.equal(route.view, view);
    }
  }
});

test('route params: defaults stay out of the route, unknown values fall back to the default', async () => {
  const { routeParams, paramValue } = await import('../public/src/app/series-panel.js');
  const e = sourceById('e'), base = e.params[0];
  assert.deepEqual(routeParams(e, { base: '10' }), {});
  assert.deepEqual(routeParams(e, { base: '12' }), { base: '12' });
  assert.deepEqual(routeParams(e, { base: '11', junk: 'x' }), {});
  assert.equal(paramValue(base, {}), '10');
  assert.deepEqual(routeParams(sourceById('thue-morse'), { base: '12' }), {});
});
