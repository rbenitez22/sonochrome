// Shared test fixture and helpers for the browser tests.
import { test as base, expect } from '@playwright/test';

// Console errors that aren't the site's: Firefox reports web-font downloads that a navigation cancels
// (leaving the page while Google Fonts loads) as errors.
const NOT_OURS = [/downloadable font: download failed/];

// `page` fails its test if the page throws or logs a console error of its own.
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !NOT_OURS.some((re) => re.test(m.text()))) errors.push('console: ' + m.text());
    });
    await use(page);
    expect(errors, 'errors on the page').toEqual([]);
  },
});
export { expect };

export const SITE = '/public/';
export const PLAYER = '/public/play.html';

// Set a field (visible or not) and fire the event the page listens for: input for text fields, else change.
export function setField(page, id, value) {
  return page.$eval('#' + id, (el, v) => {
    el.value = v;
    el.dispatchEvent(new Event(['over', 'count', 'start', 'duration'].includes(el.id) ? 'input' : 'change'));
  }, String(value));
}

// Open the player at a route ("pi", "e/color?base=12") and wait for its view to be built.
export async function openPlayer(page, route) {
  await page.goto(PLAYER + '#' + route);
  await page.waitForSelector(route.includes('/color') ? '#list div' : '.chip');
}

// The route's hash, as the address bar shows it.
export const hashOf = (page) => new URL(page.url()).hash;
