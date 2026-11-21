// The Music view against the Pi Notes prototype: the same settings give the same chips and status.
import { test, expect, PLAYER, setField } from './fixtures.js';

const PROTOTYPE = '/prototypes/pi-notes.html';
const chipsOf = (page) => page.$$eval('.chips', (boxes) => boxes.map((b) => [...b.querySelectorAll('.chip')].map((c) => c.className + ':' + c.textContent)));

async function apply(page, c) {
  await setField(page, 'scheme', c.scheme);
  if (c.codeLen) await setField(page, 'codeLen', c.codeLen);
  for (const [id, v] of [['nv', c.nv], ['scale', c.scale], ['key', c.key], ['range', c.range], ['fixedLen', c.fixedLen], ['lenMode', c.mode], ['count', c.count], ['start', c.start]]) {
    await setField(page, id, v);
  }
  await page.waitForTimeout(120);
}

const SCHEMES = [['codes', 2], ['codes', 3], ['codes', 4], ['degrees'], ['pairs'], ['steps']];

for (const [scheme, codeLen] of SCHEMES) {
  test(`@slow ${scheme}${codeLen ?? ''}: chips and status match the prototype in every mode`, async ({ page, context }) => {
    const proto = await context.newPage();
    await proto.goto(PROTOTYPE);
    await page.goto(PLAYER + '#pi');
    await Promise.all([proto.waitForSelector('.chip'), page.waitForSelector('.chip')]);
    for (const nv of [1, 3]) for (const mode of ['notes', 'time', 'infinite']) for (const start of [0, 777]) {
      const c = { scheme, codeLen, nv, mode, start, scale: start ? 'Dorian' : 'Major', key: start ? 5 : 0, range: start ? 3 : 2, fixedLen: start ? 0.5 : 1, count: start ? 40 : 24 };
      await apply(proto, c);
      await apply(page, c);
      const label = JSON.stringify(c);
      expect(await chipsOf(page), label).toEqual(await chipsOf(proto));
      expect(await page.textContent('#status'), label).toBe(await proto.textContent('#status'));
    }
  });
}

test('pinned codes behave as in the prototype across a reload', async ({ page, context }) => {
  const proto = await context.newPage();
  const results = [];
  for (const [p, url] of [[proto, PROTOTYPE], [page, PLAYER + '#pi']]) {
    await p.goto(url);
    await p.waitForSelector('.chip');
    await apply(p, { scheme: 'codes', codeLen: 3, nv: 1, mode: 'notes', start: 0, scale: 'Major', key: 0, range: 2, fixedLen: 1, count: 24 });
    await p.fill('#over', '314 = C4 1/2\n159 = rest 1/4');
    await p.waitForTimeout(150);
    await p.reload();
    await p.waitForSelector('.chip');
    await p.waitForTimeout(300);
    const after = [await p.inputValue('#codeLen'), await p.inputValue('#over'), await p.textContent('#overLabel'), await p.$$eval('.chip.pinned', (c) => c.length)];
    await setField(p, 'codeLen', 4);
    results.push([...after, await p.inputValue('#over')]);
  }
  // Firefox restores the form on reload (3-digit codes kept), Chromium doesn't; either way the two match.
  expect(results[1]).toEqual(results[0]);
});
