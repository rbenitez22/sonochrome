// Collapsible settings cards on phones: collapsed at first with a summary, opened by their heading,
// remembered across reloads; on wide screens they are plain cards.
import { test, expect, openPlayer } from './fixtures.js';

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test('settings cards start collapsed, with a summary of their settings', async ({ page }) => {
    await openPlayer(page, 'pi');
    for (const card of ['.series-panel', '.scheme-card', '.sound-card']) {
      await expect(page.locator(card + ' .card-toggle')).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator(card + ' .card-body')).toBeHidden();
    }
    await expect(page.locator('.series-panel .card-summary')).toHaveText('π · base 10 · from 0');
    await expect(page.locator('.scheme-card .card-summary')).toHaveText('Codes (groups of digits) · 4 digits per code');
    await expect(page.locator('.sound-card .card-summary')).toHaveText(/^C major · 1 instrument · 110 BPM$/);
    // The music card comes right after the collapsed Series card.
    const seriesBottom = await page.locator('.series-panel').evaluate((el) => el.getBoundingClientRect().bottom);
    expect(seriesBottom).toBeLessThan(400);
  });

  test('a heading opens its card, the summary follows edits, and the state survives a reload', async ({ page }) => {
    await openPlayer(page, 'pi');
    await page.click('.series-panel .card-toggle');
    await expect(page.locator('#start')).toBeVisible();
    await expect(page.locator('.series-panel .card-toggle')).toHaveAttribute('aria-expanded', 'true');
    await page.click('#presets [data-v="4000000"]');
    await expect(page.locator('.series-panel .card-summary')).toContainText('from 4,000,000');
    await page.reload();
    await page.waitForSelector('.chip', { state: 'attached' });
    await expect(page.locator('#start')).toBeVisible();
    await expect(page.locator('.scheme-card .card-body')).toBeHidden();
  });

  test('on Colour, the Image card keeps its buttons in view when collapsed', async ({ page }) => {
    await openPlayer(page, 'pi/color');
    await expect(page.locator('.image-card .card-body')).toBeHidden();
    await expect(page.locator('#savePng')).toBeVisible();
    await page.click('.image-card .card-toggle');
    await page.fill('#w', '20');   // typed, so the input event bubbles as a user's does
    await expect(page.locator('.image-card .card-summary')).toHaveText('20×16 cells · 20 px per cell');
  });
});

test('on a wide screen the cards are plain: no toggles, every body shown', async ({ page }) => {
  await openPlayer(page, 'pi');
  await expect(page.locator('.card-toggle')).toHaveCount(0);
  await expect(page.locator('.series-panel > h2')).toHaveText('Series');
  await expect(page.locator('#start')).toBeVisible();
  await expect(page.locator('#scheme')).toBeVisible();
});
