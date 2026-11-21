// Playing in real time: Notes, Time and Infinite; random start; the tempo slider; the background refill.
import { test, expect, openPlayer, setField } from './fixtures.js';

const setTempo = (page, bpm) => page.$eval('#tempo', (el, v) => { el.value = v; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); }, bpm);
const played = (page) => expect(page.locator('#status')).toHaveText(/Played digits/, { timeout: 30_000 });

test('@slow Notes plays, highlights the playing chip, and stops at the end', async ({ page }) => {
  await openPlayer(page, 'pi');
  await setField(page, 'count', 6);
  await setTempo(page, 200);
  await page.click('#play');
  await expect(page.locator('#play')).toHaveText('Stop');
  await expect(page.locator('.chip.on')).toHaveCount(1);
  await expect(page.locator('#status')).toHaveText(/^0:0\d \/ 0:03 · digit /);
  await played(page);
  await expect(page.locator('#play')).toHaveText('Play');
  await expect(page.locator('#status')).toHaveText('Played digits 0–23 (0:03).');
});

test('@slow Time stops on time, and Play again starts from the start', async ({ page }) => {
  await openPlayer(page, 'pi');
  await setField(page, 'lenMode', 'time');
  await setField(page, 'duration', '0:05');
  const t0 = Date.now();
  await page.click('#play');
  await played(page);
  const seconds = (Date.now() - t0) / 1000;
  expect(seconds).toBeGreaterThan(4.5);
  expect(seconds).toBeLessThan(9);
  await expect(page.locator('#status')).toHaveText(/^Played digits 0–\d+ \(0:05\)\.$/);
  await page.click('#play');
  await expect(page.locator('#status')).toHaveText(/^0:0\d \/ 0:05 · digit /);
  await page.click('#play');
});

test('@slow Infinite runs past the preview and drops chips that played long ago', async ({ page }) => {
  await openPlayer(page, 'pi');
  await setField(page, 'lenMode', 'infinite');
  await setField(page, 'scheme', 'degrees');
  await setField(page, 'fixedLen', 0.5);
  await setTempo(page, 200);
  const first = await page.$('.chip');
  await page.click('#play');
  await expect.poll(() => first.evaluate((e) => e.isConnected), { timeout: 40_000, intervals: [1000] }).toBe(false);
  expect(await page.locator('.chip').count()).toBeGreaterThan(64);
  await expect(page.locator('#status')).toHaveText(/ · ∞ · digit /);
  await page.click('#play');
  await expect(page.locator('#status')).toHaveText(/^Played digits 0–\d+ \(0:\d\d\)\.$/);
});

test('random each play picks a new start; moving the tempo stops playback', async ({ page }) => {
  await openPlayer(page, 'pi');
  await setField(page, 'lenMode', 'infinite');
  await page.check('#randomEach');
  await page.click('#play');
  await expect(page.locator('#play')).toHaveText('Stop');
  expect(await page.inputValue('#start')).not.toBe('0');
  await setTempo(page, 150);
  await expect(page.locator('#play')).toHaveText('Play');
});

test('a due refill computes more digits in a background worker while π plays (needs GMP)', async ({ page }) => {
  await openPlayer(page, 'pi');
  await setField(page, 'lenMode', 'infinite');
  // Make a refill due at once (REFILL is the shared module object the player reads), and count the
  // workers started: a refill always runs in the digits worker, never on the page.
  await page.evaluate(async () => {
    (await import('/public/src/app/music/piece.js')).REFILL.atSec = 1e9;
    const Original = window.Worker;
    window.workersStarted = 0;
    window.Worker = class extends Original { constructor(...args) { super(...args); window.workersStarted++; } };
  });
  await page.click('#play');
  await expect.poll(() => page.evaluate(() => window.workersStarted), { timeout: 10_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(2000);
  await expect(page.locator('#play')).toHaveText('Stop');
  await expect(page.locator('#status')).toHaveText(/ · ∞ · digit /);
  await page.click('#play');
});
