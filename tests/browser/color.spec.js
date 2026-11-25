// The Colour view on its own: Compute, shrinking to fit, the canvas-area cap, the PNG, mode limits.
import { test, expect, openPlayer, setField } from './fixtures.js';

const status = (page) => page.locator('#colorStatus');

test('past quickLength the view offers Compute, then draws (needs GMP)', async ({ page }) => {
  await openPlayer(page, 'pi/color');
  await page.fill('#start', '19000');
  await expect(status(page)).toHaveText(/^Digits up to 21,304 are not computed yet\. Press Compute/);
  await expect(page.locator('#compute')).toHaveText('Compute');
  await page.click('#compute');
  await expect(page.locator('#compute')).toHaveText('Draw', { timeout: 60_000 });
  await expect(status(page)).toHaveText('16×16 cells · 2304 digits used (positions 19000–21303) · canvas 320×320px');
});

test('an image that would read past the source’s end shrinks to fit', async ({ page }) => {
  await openPlayer(page, 'recaman/color');
  await page.fill('#start', '999900');
  await expect(status(page)).toHaveText('16×6 cells · 96 terms used (positions 999900–999995) · canvas 320×120px (size reduced to fit the available terms)');
  await expect(page.locator('#w')).toHaveValue('16');
  await expect(page.locator('#h')).toHaveValue('6');
});

test('large images stay within the iOS canvas area, and are painted to the far corner', async ({ page }) => {
  await openPlayer(page, 'thue-morse/color');
  await page.selectOption('#mode', 'pal');
  for (const [id, v] of [['w', 300], ['h', 300], ['px', 20]]) await setField(page, id, v);
  await expect(status(page)).toHaveText(/canvas 3900×3900px \(pixel size reduced to 13 to stay within the browser's canvas limit\)$/);
  const corner = await page.$eval('#cv', (cv) => cv.getContext('2d').getImageData(cv.width - 2, cv.height - 2, 1, 1).data[3]);
  expect(corner).toBe(255);
});

test('Download PNG saves <source>-<start>-<mode>-<w>x<h>.png', async ({ page }) => {
  await openPlayer(page, 'pi/color');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#savePng')]);
  expect(download.suggestedFilename()).toBe('pi-0-rgb3-16x16.png');
});

test('modes a series refuses are disabled with the reason', async ({ page }) => {
  await openPlayer(page, 'thue-morse/color');
  const disabled = await page.$$eval('#mode option', (os) => os.filter((o) => o.disabled).map((o) => o.value));
  expect(disabled).toEqual(['hex', 'hsl', 'wheel', 'shade']);
  await expect(page.locator('#mode option[value=hsl]')).toHaveAttribute('title', /^Not available for Thue–Morse: it /);
});

test('with Random each time, Draw picks a new random start and draws it', async ({ page }) => {
  await openPlayer(page, 'pi/color');
  await expect(page.locator('#compute')).toHaveText('Draw');
  await page.selectOption('#randomMax', '20000');
  await page.check('#randomEach');
  const starts = new Set();
  for (let i = 0; i < 3; i++) {
    await page.click('#compute');
    const start = await page.inputValue('#start');
    starts.add(start);
    await expect(status(page)).toContainText('(positions ' + start.replace(/,/g, '') + '–');
  }
  expect(starts.size).toBeGreaterThan(1);
});
