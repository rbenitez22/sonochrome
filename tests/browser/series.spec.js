// All nine series in both views; bases; computing in the worker; integer wording; hints per base.
import { test, expect, openPlayer, setField } from './fixtures.js';

const SERIES = [
  // id, first chips, default scheme, default colour mode, unit
  ['pi', '3141 5926 5358', 'codes', 'rgb3', 'digit'],
  ['e', '2718 2818 2845', 'codes', 'rgb3', 'digit'],
  ['sqrt2', '1414 2135 6237', 'codes', 'rgb3', 'digit'],
  ['phi', '1618 0339 8874', 'codes', 'rgb3', 'digit'],
  ['ln2', '0693 1471 8055', 'codes', 'rgb3', 'digit'],
  ['thue-morse', '0 1 1', 'degrees', 'rgb3', 'digit'],
  ['fibonacci-word', '0 1 0', 'degrees', 'rgb3', 'digit'],
  ['norgard', '0 1 -1', 'values', 'wheel', 'term'],
  ['recaman', '0 1 3', 'values', 'wheel', 'term'],
];

for (const [id, chips, scheme, mode, unit] of SERIES) {
  test(`${id}: plays and draws, with ${unit} wording`, async ({ page }) => {
    await openPlayer(page, id);
    await expect(page.locator('#scheme')).toHaveValue(scheme);
    expect((await page.$$eval('.chip .dg', (c) => c.slice(0, 3).map((x) => x.textContent))).join(' ')).toBe(chips);
    await expect(page.locator('#startLabel')).toHaveText(`Start at position (0 is the first ${unit}). Type 4M, 250k or 4,000,000.`);
    await page.click('#play');
    await expect(page.locator('#status')).toHaveText(new RegExp(` · ${unit} \\d+`));
    await page.click('#play');
    await page.click('#view-color');
    await page.waitForSelector('#list div');
    await expect(page.locator('#mode')).toHaveValue(mode);
    await expect(page.locator('#digitsHead')).toHaveText(unit === 'term' ? 'Terms used' : 'Digits used');
  });
}

test('base 12: e plays one digit per scale step, with the base in the note', async ({ page }) => {
  await openPlayer(page, 'e?base=12');
  await expect(page.locator('#scheme')).toHaveValue('degrees');
  await expect(page.locator('#scheme option[value=codes]')).toBeDisabled();
  expect((await page.$$eval('.chip .dg', (c) => c.slice(0, 8).map((x) => x.textContent))).join('')).toBe('28752360');
  await expect(page.locator('#schemeNote')).toHaveText(/the digits a and b are steps 10 and 11/);
});

test('base 16: π’s first hex digits colour its first cell, and the hints show hex ranges', async ({ page }) => {
  await openPlayer(page, 'pi/color?base=16');
  await page.selectOption('#mode', 'rgb2');
  await expect(page.locator('#list div').first()).toHaveText(/^3243f6\s*→ #3243f6$/);
  await page.selectOption('#mode', 'gray');
  await expect(page.locator('#modeHint')).toHaveText('A 3-digit group (000–fff) becomes a gray level.');
});

test('base 7: the steps note names only base-7 digits', async ({ page }) => {
  await openPlayer(page, 'e?base=7');
  await page.selectOption('#scheme', 'steps');
  await expect(page.locator('#schemeNote')).toHaveText('Each digit moves the melody from the previous note: 0 repeats, 1 to 4 go up that many scale steps, and 5 and 6 go down 1 and 2.');
});

test('ln 2 in hex from position 100,000 computes in the worker, then plays (needs GMP)', async ({ page }) => {
  await openPlayer(page, 'ln2?base=16');
  await page.fill('#start', '100k');
  await expect(page.locator('#status')).toHaveText(/^Press Play to compute them/);
  await page.click('#play');
  await expect(page.locator('#play')).toHaveText('Stop', { timeout: 60_000 });
  await expect(page.locator('#status')).toHaveText(/ · digit 100,0\d\d/);
  await page.click('#play');
});

test('integer series show their terms in the readout, one term per cell', async ({ page }) => {
  await openPlayer(page, 'norgard/color');
  await page.hover('#cv', { position: { x: 5, y: 5 } });
  await expect(page.locator('#readout')).toHaveText(/^cell \(0, 0\) · term 0 at position 0/);
  await expect(page.locator('#digits')).toHaveText(/^0, 1, -1, 2, 1, 0, -2, 3/);
});
