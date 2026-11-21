// Piece 5a: player routes in the URL hash (app/route.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, formatRoute, playerHref } from '../public/src/app/route.js';
import { SOURCES, sourceById } from '../public/src/sources/index.js';

test('parseRoute reads the source id and its params', () => {
  assert.deepEqual(parseRoute('#pi'), { id: 'pi', params: {} });
  assert.deepEqual(parseRoute('#pi?base=12&x=a%20b'), { id: 'pi', params: { base: '12', x: 'a b' } });
  assert.deepEqual(parseRoute('thue-morse'), { id: 'thue-morse', params: {} });
  for (const empty of ['', '#', undefined, null]) assert.deepEqual(parseRoute(empty), { id: '', params: {} });
  assert.equal(parseRoute('#%E0%A4%A').id, '%E0%A4%A', 'a malformed escape is kept as typed');
});

test('formatRoute and parseRoute round-trip', () => {
  for (const [id, params] of [['pi', {}], ['pi', { base: 12 }], ['thue-morse', { a: 'x y', b: '&?' }]]) {
    const back = parseRoute(formatRoute(id, params));
    assert.equal(back.id, id);
    assert.deepEqual(back.params, Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
  }
  assert.equal(formatRoute('pi', { base: 12 }), '#pi?base=12');
});

test('every source has a player link that routes back to it', () => {
  for (const s of SOURCES) {
    const href = playerHref(s.id);
    assert.match(href, /^play\.html#/);
    assert.equal(sourceById(parseRoute(href.slice(href.indexOf('#'))).id), s);
  }
});
