// Player routes in the hash: source, view and params; unknown sources; history; the view tabs.
import { test, expect, PLAYER, openPlayer, hashOf } from './fixtures.js';

test('an unknown or missing source goes to the welcome page', async ({ page }) => {
  await page.goto(PLAYER + '#nope');
  await page.waitForURL(/index\.html$/);
  await page.goto(PLAYER);
  await page.waitForURL(/index\.html$/);
});

test('the route names the view; the tabs switch it and Back returns', async ({ page }) => {
  await openPlayer(page, 'pi/color');
  await expect(page.locator('#colorParts')).toBeVisible();
  await expect(page.locator('#musicParts')).toBeHidden();
  await page.click('#view-music');
  await page.waitForSelector('.chip');
  expect(hashOf(page)).toBe('#pi');
  await page.goBack();
  await expect(page.locator('#view-color')).toHaveAttribute('aria-selected', 'true');
  expect(hashOf(page)).toBe('#pi/color');
});

test('arrow keys move between the view tabs', async ({ page }) => {
  await openPlayer(page, 'pi');
  await page.focus('#view-music');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#view-color')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#view-color')).toBeFocused();
  expect(hashOf(page)).toBe('#pi/color');
});

test('changing the hash switches series in place; Back and Forward follow', async ({ page }) => {
  await openPlayer(page, 'pi');
  await page.evaluate(() => { location.hash = 'thue-morse'; });
  await expect(page).toHaveTitle('Thue–Morse · Sonochrome');
  await page.goBack();
  await expect(page).toHaveTitle('π · Sonochrome');
  await page.goForward();
  await expect(page).toHaveTitle('Thue–Morse · Sonochrome');
});

test('the Base select sets ?base=, leaves the default out, and Back returns to it', async ({ page }) => {
  await openPlayer(page, 'e');
  await page.selectOption('#param-base', '12');
  await expect.poll(() => hashOf(page)).toBe('#e?base=12');
  await page.click('#view-color');
  await page.waitForSelector('#list div');
  expect(hashOf(page)).toBe('#e/color?base=12');
  await expect(page.locator('#param-base')).toHaveValue('12');
  await page.goBack();
  await page.goBack();
  await expect.poll(() => hashOf(page)).toBe('#e');
  await expect(page.locator('#param-base')).toHaveValue('10');
});

test('the start position is shared between the views', async ({ page }) => {
  await openPlayer(page, 'pi/color');
  await page.fill('#start', '1000');
  await page.click('#view-music');
  await expect(page.locator('#rangeNote')).toHaveText(/^Using digits 1,000 to /);
});
