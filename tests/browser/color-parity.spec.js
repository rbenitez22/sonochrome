// The Colour view against the Pi Color Generator prototype: the same settings give the same colours,
// digits and canvas pixels.
import { test, expect, PLAYER } from './fixtures.js';

const PROTOTYPE = '/prototypes/pi-color-generator.html';
const MODES = ['rgb3', 'rgb2', 'hex', 'hsl', 'gray', 'pal', 'cmyk'];

const set = (page, id, value, event = 'change') => page.$eval('#' + id, (el, [v, e]) => { el.value = v; el.dispatchEvent(new Event(e)); }, [String(value), event]);
// The colour list, the digits used (without the prototype's π-only "3." prefix), and a hash of the canvas pixels.
const snapshot = (page) => page.evaluate(() => {
  const cv = document.getElementById('cv'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let hash = 0;
  for (let i = 0; i < d.length; i++) hash = (hash * 31 + d[i]) >>> 0;
  return { list: document.getElementById('list').innerText, digits: document.getElementById('digits').textContent.replace(/^3\./, '3'), size: cv.width + 'x' + cv.height, hash };
});

async function openBoth(page, context) {
  const proto = await context.newPage();
  await proto.goto(PROTOTYPE);
  await page.goto(PLAYER + '#pi/color');
  await page.waitForSelector('#list div');
  await proto.waitForSelector('#list div');
  return proto;
}

for (const mode of MODES) {
  test(`@slow ${mode}: every fill order, size and start matches the prototype`, async ({ page, context }) => {
    const proto = await openBoth(page, context);
    for (const order of ['row', 'snake', 'col', 'spiral']) for (const [w, h] of [[16, 16], [16, 9]]) for (const start of [0, 777]) {
      for (const [p, startId, event] of [[proto, 'offset', 'change'], [page, 'start', 'input']]) {
        for (const [id, v] of [['mode', mode], ['order', order], ['w', w], ['h', h], ['px', 8]]) await set(p, id, v);
        await set(p, startId, start, event);
      }
      await proto.waitForTimeout(80);
      await page.waitForTimeout(80);
      expect(await snapshot(page), JSON.stringify({ mode, order, w, h, start })).toEqual(await snapshot(proto));
    }
  });
}

test('the readout and the readout formats match the prototype', async ({ page, context }) => {
  const proto = await openBoth(page, context);
  for (const p of [proto, page]) {
    await set(p, 'fmt', 'hsl');
    await p.waitForTimeout(80);
    await p.hover('#cv', { position: { x: 20, y: 12 } });
  }
  expect(await page.$eval('#readout', (e) => e.innerText)).toBe(await proto.$eval('#readout', (e) => e.innerText));
  expect(await page.$eval('#list', (e) => e.innerText)).toBe(await proto.$eval('#list', (e) => e.innerText));
});
