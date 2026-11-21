// The welcome page: one card per source, with previews, linking to both views of the player.
import { test, expect, SITE } from './fixtures.js';

const ORDER = ['π', 'e', '√2', 'φ', 'ln 2', '01', '010', '∞', 'R'];

test('nine cards in order, each with a preview of its first symbols', async ({ page }) => {
  await page.goto(SITE);
  const cards = page.locator('.card');
  await expect(cards).toHaveCount(9);
  await expect(cards.locator('.sym')).toHaveText(ORDER);
  await expect(cards.locator('.preview').first()).toHaveText(/^31415926535897932384626433832795…$/);
  await expect(cards.nth(4).locator('.preview')).toHaveText(/^06931471/);       // ln 2: the integer part's 0 first
  await expect(cards.nth(6).locator('.preview')).toHaveText(/^01001010010010/);  // the Fibonacci word
  await expect(cards.nth(7).locator('.preview')).toHaveText(/^0, 1, -1, 2, 1, 0, -2, 3/);  // Nørgård: terms
  await expect(cards.nth(8).locator('.preview')).toHaveText(/^0, 1, 3, 6, 2, 7, 13/);      // Recamán
  await expect(cards.nth(7).locator('.preview')).toHaveAttribute('aria-label', 'First terms');
});

for (const [i, id, title] of [[0, 'pi', 'π'], [5, 'thue-morse', 'Thue–Morse'], [8, 'recaman', 'Recamán']]) {
  test(`${id}: Hear it opens Music, See it opens Colour, and All series comes back`, async ({ page }) => {
    await page.goto(SITE);
    await page.locator('.card').nth(i).locator('.hear').click();
    await page.waitForSelector('.chip');
    await expect(page).toHaveTitle(`${title} · Sonochrome`);
    expect(new URL(page.url()).hash).toBe('#' + id);
    await expect(page.locator('#view-music')).toHaveAttribute('aria-selected', 'true');
    await page.click('.back');
    await page.locator('.card').nth(i).locator('.see').click();
    await page.waitForSelector('#list div');
    expect(new URL(page.url()).hash).toBe('#' + id + '/color');
    await expect(page.locator('#view-color')).toHaveAttribute('aria-selected', 'true');
  });
}
