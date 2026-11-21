// Refills with fake sources registered in the page: a slow one (the music waits, then resumes) and one
// whose background computation fails (playback ends where the generated music ends).
import { test, expect, PLAYER, setField } from './fixtures.js';

// 40 digits right away; background refills take `delay` ms, then succeed or fail.
async function addFakeSource(page, id, delay, fail) {
  await page.evaluate(async ([id, delay, fail]) => {
    const { SOURCES } = await import('/public/src/sources/index.js');
    const { digitStringSeq } = await import('/public/src/sources/seq.js');
    const digits = (n) => digitStringSeq(Array.from({ length: n }, (_, i) => (i * 7 + 3) % 10).join(''), 10);
    SOURCES.push({
      id, name: id, blurb: '', kind: 'digit', params: [], maxLength: 1e6, quickLength: 1e6,
      async prepare(params, upTo, report, { allowInline = true } = {}) {
        if (allowInline) return digits(Math.min(upTo, 40));
        await new Promise((r) => setTimeout(r, delay));
        if (fail) throw new Error('background tasks are not available');
        return digits(upTo);
      },
    });
  }, [id, delay, fail]);
}

async function playFast(page, id) {
  await page.evaluate((id) => { location.hash = id; }, id);
  await expect(page).toHaveTitle(`${id} · Sonochrome`);
  await setField(page, 'lenMode', 'infinite');
  await setField(page, 'scheme', 'degrees');
  await setField(page, 'fixedLen', 0.5);
  await page.$eval('#tempo', (el) => { el.value = 200; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); });
  await page.waitForSelector('.chip');
  await page.click('#play');
}

test('the music waits for a slow refill, then plays on', async ({ page }) => {
  await page.goto(PLAYER + '#pi');
  await page.waitForSelector('.chip');
  await addFakeSource(page, 'slow', 9000, false);
  await playFast(page, 'slow');
  await expect(page.locator('#status')).toHaveText(/computing more digits/);
  await expect(page.locator('#status')).toHaveText(/ · digit 39 · waiting for more digits…$/, { timeout: 20_000 });
  await expect(page.locator('#status')).toHaveText(/ · digit (4\d|[5-9]\d)\b/, { timeout: 20_000 });
  await page.click('#play');
});

test('with no refill possible, playback ends where the generated music ends', async ({ page }) => {
  await page.goto(PLAYER + '#pi');
  await page.waitForSelector('.chip');
  await addFakeSource(page, 'broken', 3000, true);
  await playFast(page, 'broken');
  await expect(page.locator('#status')).toHaveText('Stopped: no more computed digits. Played digits 0–39 (0:06).', { timeout: 20_000 });
});
