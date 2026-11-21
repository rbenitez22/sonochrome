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
  assert.match(read('public/play.html'), /<script type="module" src="src\/app\/play.js"><\/script>/);
});

test('every id the scripts of a page look up exists in that page', () => {
  const dir = new URL('public/src/app/', root);
  const pages = {
    'public/play.html': ['dom.js', 'progress.js', 'start.js', 'series-panel.js', 'music/controls.js', 'music/chips.js',
      'music/tabs.js', 'music/player.js', 'music/roll.js', 'music/score.js', 'music/download.js',
      'play.js', 'views.js', 'unit.js', 'color/view.js', 'color/controls.js', 'color/canvas.js', 'color/lists.js',
      'color/export.js'],
    'public/index.html': ['welcome.js'],
  };
  for (const [page, files] of Object.entries(pages)) {
    const html = read(page);
    const ids = new Set(files.flatMap((f) => [...readFileSync(new URL(f, dir), 'utf8').matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1])));
    for (const id of ids) assert.match(html, new RegExp(`id="${id}"`), `${page}: ${id}`);
  }
});

test('the welcome page builds its cards from the sources, and its fallback links name real sources', async () => {
  const html = read('public/index.html');
  assert.match(html, /<script type="module" src="src\/app\/welcome.js"><\/script>/);
  assert.match(html, /<nav class="cards" id="cards" aria-label="Series">/);
  const { sourceById } = await import('../public/src/sources/index.js');
  const { parseRoute } = await import('../public/src/app/route.js');
  const links = [...html.matchAll(/href="play\.html(#[^"]*)"/g)].map((m) => m[1]);
  assert.ok(links.length > 0);
  for (const hash of links) assert.ok(sourceById(parseRoute(hash).id), hash);
});
