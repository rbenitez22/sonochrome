// Deploy layout: wrangler serves ./public as the Worker sonochrome, and public/ holds only the site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('wrangler.jsonc deploys ./public as the Worker sonochrome', () => {
  const cfg = JSON.parse(read('wrangler.jsonc').replace(/^\s*\/\/.*$/gm, ''));
  assert.equal(cfg.name, 'sonochrome');
  assert.equal(cfg.assets.directory, './public');
});

test('public/ holds the welcome page and nothing from outside the site', () => {
  assert.ok(existsSync(new URL('public/index.html', root)));
  assert.match(read('public/index.html'), /<title>Sonochrome<\/title>/);
  for (const p of ['public/plans', 'public/tests', 'public/prototypes']) assert.ok(!existsSync(new URL(p, root)), p);
});

test('the player page and the favicon are in public/, and both pages link the icon', () => {
  for (const page of ['public/index.html', 'public/play.html']) assert.match(read(page), /<link rel="icon" href="favicon.svg" type="image\/svg\+xml">/, page);
  assert.match(read('public/favicon.svg'), /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 64 64">/);
  assert.match(read('public/play.html'), /<script type="module" src="src\/app\/music\/player.js"><\/script>/);
});

test('every id the player scripts look up exists in play.html', () => {
  const html = read('public/play.html');
  const dir = new URL('public/src/app/', root);
  const files = ['dom.js', 'progress.js', 'music/controls.js', 'music/chips.js', 'music/tabs.js', 'music/player.js'];
  const ids = new Set(files.flatMap((f) => [...readFileSync(new URL(f, dir), 'utf8').matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1])));
  for (const id of ids) assert.match(html, new RegExp(`id="${id}"`), id);
});
