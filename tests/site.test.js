// Deploy layout: wrangler serves ./public, and the welcome page is there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('wrangler.jsonc deploys ./public as pi-notes', () => {
  const cfg = JSON.parse(read('wrangler.jsonc').replace(/^\s*\/\/.*$/gm, ''));
  assert.equal(cfg.name, 'pi-notes');
  assert.equal(cfg.assets.directory, './public');
});

test('public/ holds the welcome page and nothing from outside the site', () => {
  assert.ok(existsSync(new URL('public/index.html', root)));
  assert.match(read('public/index.html'), /<title>Chromatone<\/title>/);
  for (const p of ['public/plans', 'public/tests', 'public/prototypes']) assert.ok(!existsSync(new URL(p, root)), p);
});
