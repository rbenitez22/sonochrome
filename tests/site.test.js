// Deploy layout: public/ is the folder uploaded to Cloudflare Pages, and it holds only the site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('the deploy script uploads public/ to the Pages project sonochrome', () => {
  const { scripts } = JSON.parse(read('package.json'));
  assert.match(scripts.deploy, /pages deploy public --project-name sonochrome --branch splinter$/);
});

test('public/ holds the welcome page and nothing from outside the site', () => {
  assert.ok(existsSync(new URL('public/index.html', root)));
  assert.match(read('public/index.html'), /<title>Sonochrome<\/title>/);
  for (const p of ['public/plans', 'public/tests', 'public/prototypes']) assert.ok(!existsSync(new URL(p, root)), p);
});
