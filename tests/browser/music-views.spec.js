// The music views: piano roll, sheet music, the remembered tab, MusicXML downloads, fitted score rows.
import { readFileSync } from 'node:fs';
import { test, expect, openPlayer, setField } from './fixtures.js';
import { assertWellFormed } from '../musicxml-checks.js';
import { readMidi, notesOf } from '../midi-reader.js';

// Every measure of every part sums to 16 divisions (4/4 at four divisions a quarter).
const fullBars = (xml) => [...xml.matchAll(/<measure number="\d+">([\s\S]*?)<\/measure>/g)]
  .every((m) => [...m[1].matchAll(/<duration>(\d+)<\/duration>/g)].reduce((t, d) => t + +d[1], 0) === 16);

async function save(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#dlXml')]);
  const xml = readFileSync(await download.path(), 'utf8');
  assertWellFormed(xml);
  expect(fullBars(xml)).toBe(true);
  return { name: download.suggestedFilename(), xml };
}

test('the piano roll draws the piece', async ({ page }) => {
  await openPlayer(page, 'pi');
  await page.click('#tab-roll');
  const inked = await page.$eval('#roll', (cv) => {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
  expect(inked).toBeGreaterThan(1000);
});

test('the score draws, redraws for a new clef, highlights while playing, and its tab is remembered', async ({ page }) => {
  await openPlayer(page, 'pi');
  await page.click('#tab-sheet');
  await page.waitForSelector('#sheet svg');
  await expect(page.locator('#sheet svg .vf-stavenote')).toHaveCount(29);
  await expect(page.locator('#clef')).toBeVisible();
  const before = await page.$('#sheet svg');
  await page.selectOption('#clef', 'bass');
  await expect.poll(() => before.evaluate((e) => e.isConnected)).toBe(false);
  await page.click('#play');
  await expect(page.locator('#sheet svg .on').first()).toBeAttached();
  await page.click('#play');
  await page.reload();
  await page.waitForSelector('#sheet svg');
  await expect(page.locator('#tab-sheet')).toHaveAttribute('aria-selected', 'true');
});

test('@slow while streaming, the score turns to the next page at bar 9', async ({ page }) => {
  await openPlayer(page, 'pi');
  await setField(page, 'lenMode', 'infinite');
  await setField(page, 'scheme', 'degrees');
  await setField(page, 'fixedLen', 0.5);
  await page.$eval('#tempo', (el) => { el.value = 200; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); });
  await page.click('#tab-sheet');
  const page1 = await page.waitForSelector('#sheet svg');
  await page.click('#play');
  await expect.poll(() => page1.evaluate((e) => e.isConnected), { timeout: 20_000, intervals: [500] }).toBe(false);
  await expect(page.locator('#sheet svg .on').first()).toBeAttached();
  await page.click('#play');
});

test('MusicXML downloads for Notes, Time, Infinite (after playing) and another series', async ({ page }) => {
  await openPlayer(page, 'pi');
  await page.click('#tab-sheet');
  expect((await save(page)).name).toBe('pi-0-95.musicxml');
  await setField(page, 'lenMode', 'time');
  await setField(page, 'duration', '0:20');
  const time = await save(page);
  expect(time.name).toBe('pi-0-155.musicxml');
  expect(time.xml).toContain('<movement-title>Sonochrome: digits 0–155</movement-title>');
  await setField(page, 'lenMode', 'infinite');
  await expect(page.locator('#dlXml')).toBeDisabled();
  await page.click('#play');
  await expect(page.locator('#dlXml')).toBeEnabled();
  await page.waitForTimeout(1500);
  await page.click('#play');
  expect((await save(page)).name).toMatch(/^pi-0-\d+\.musicxml$/);
  await openPlayer(page, 'thue-morse');
  await setField(page, 'lenMode', 'notes');
  expect((await save(page)).name).toBe('thue-morse-0-23.musicxml');
});

test('score rows fit their notes: nothing is clipped, however low or high', async ({ page }) => {
  await openPlayer(page, 'pi');
  await page.click('#tab-sheet');
  await page.waitForSelector('#sheet svg');
  const outside = () => page.evaluate(() => {
    const svg = document.querySelector('#sheet svg'), H = +svg.getAttribute('height');
    return [...svg.querySelectorAll('.vf-stavenote')].map((n) => n.getBBox()).filter((b) => b.y < 0 || b.y + b.height > H).length;
  });
  for (const [id, v] of [['scheme', 'degrees'], ['range', 2], ['oct0', 2], ['clef', 'treble']]) await setField(page, id, v);
  await page.waitForTimeout(300);
  expect(await outside()).toBe(0);
  await setField(page, 'nv', 3);
  for (const [id, v] of [['oct0', 5], ['oct1', 1], ['oct2', 2], ['range', 3], ['count', 64]]) await setField(page, id, v);
  await page.waitForTimeout(500);
  await expect(page.locator('#sheet svg .vf-stavenote')).toHaveCount(192);
  expect(await outside()).toBe(0);
});

test('the score shows the key signature of the Key and Scale, and spells notes in it', async ({ page }) => {
  await openPlayer(page, 'pi');
  for (const [id, v] of [['key', 4], ['scheme', 'degrees'], ['scale', 'Major']]) await setField(page, id, v);   // E major
  await expect(page.locator('.chip .nt').nth(1)).toHaveText('F#3');
  await page.click('#tab-sheet');
  await page.waitForSelector('#sheet svg .vf-keysignature');
  // Accidentals draw as extra paths inside the notes: E major's notes need none, None (C) spells them with flats.
  const notePaths = () => page.$$eval('#sheet svg .vf-stavenote', (ns) => ns.reduce((t, n) => t + n.querySelectorAll('path').length, 0));
  const inKey = await notePaths();
  const keyPaths = await page.$$eval('#sheet svg .vf-keysignature', (ks) => ks.map((k) => k.querySelectorAll('path').length).filter((n) => n > 0));
  expect(keyPaths.length).toBeGreaterThan(0);
  expect(keyPaths.every((n) => n === 4)).toBe(true);   // four sharps on every system
  const { xml } = await save(page);
  expect(xml).toContain('<key><fifths>4</fifths><mode>major</mode></key>');
  expect(xml).toMatch(/<step>F<\/step><alter>1<\/alter>/);
  await page.selectOption('#keySig', 'none');
  await expect(page.locator('.chip .nt').nth(1)).toHaveText('Gb3');
  await expect.poll(notePaths).toBeGreaterThan(inKey);
  expect(await page.$$eval('#sheet svg .vf-keysignature path', (ps) => ps.length)).toBe(0);
});

test('C major keeps the flat spelling and no signature', async ({ page }) => {
  await openPlayer(page, 'pi');
  await page.click('#tab-sheet');
  await page.waitForSelector('#sheet svg');
  expect(await page.$$eval('#sheet svg .vf-keysignature path', (ps) => ps.length)).toBe(0);
  for (const [id, v] of [['key', 5], ['scale', 'Natural minor']]) await setField(page, id, v);   // F minor: 4 flats
  // One signature per system (the score may wrap onto several), each with four flats.
  await expect.poll(() => page.$$eval('#sheet svg .vf-keysignature', (ks) => ks.map((k) => k.querySelectorAll('path').length).filter((n) => n > 0))).toEqual(expect.arrayContaining([4]));
  const counts = await page.$$eval('#sheet svg .vf-keysignature', (ks) => ks.map((k) => k.querySelectorAll('path').length).filter((n) => n > 0));
  expect(counts.every((n) => n === 4)).toBe(true);
});

// Download the MIDI file and read it back.
async function saveMidi(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#dlMidi')]);
  return { name: download.suggestedFilename(), midi: readMidi(readFileSync(await download.path())) };
}

test('MIDI downloads for Notes, Time and Infinite (after playing), with tracks, programs and key', async ({ page }) => {
  await openPlayer(page, 'pi');
  await setField(page, 'nv', 2);
  await page.click('#tab-sheet');
  const notes = await saveMidi(page);
  expect(notes.name).toBe('pi-0-187.mid');   // two voices read digits 0–187
  expect(notes.midi.format).toBe(1);
  expect(notes.midi.tracks).toHaveLength(3);
  const title = notes.midi.tracks[0].find((e) => e.meta === 0x03).data;
  expect(new TextDecoder().decode(Uint8Array.from(title))).toBe('π: digits 0–187');
  expect(notes.midi.tracks[1].find((e) => e.kind === 0xc0).a).toBe(0);    // piano: GM program 1
  expect(notes.midi.tracks[2].find((e) => e.kind === 0xc0).a).toBe(32);   // bass: GM program 33
  expect(notesOf(notes.midi.tracks[1]).length).toBeGreaterThan(10);
  for (const [id, v] of [['key', 4], ['scale', 'Major'], ['lenMode', 'time'], ['duration', '0:20']]) await setField(page, id, v);
  const time = await saveMidi(page);
  expect(time.midi.tracks[0].find((e) => e.meta === 0x59).data).toEqual([4, 0]);   // E major
  await setField(page, 'lenMode', 'infinite');
  await expect(page.locator('#dlMidi')).toBeDisabled();
  await page.click('#play');
  await expect(page.locator('#dlMidi')).toBeEnabled();
  await page.waitForTimeout(1500);
  await page.click('#play');
  expect((await saveMidi(page)).name).toMatch(/^pi-0-\d+\.mid$/);
});


test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test('no music tab, nor the sheet music tools, is wider than the screen', async ({ page }) => {
    await openPlayer(page, 'pi');
    for (const tab of ['digits', 'roll', 'sheet']) {
      await page.click('#tab-' + tab);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    }
    await expect(page.locator('#dlMidi')).toBeInViewport();
  });
});

test('the sheet music downloads are icons that keep their names and tooltips', async ({ page }) => {
  await openPlayer(page, 'pi');
  await page.click('#tab-sheet');
  await expect(page.locator('#dlXml')).toHaveAccessibleName('Download MusicXML');
  await expect(page.locator('#dlMidi')).toHaveAccessibleName('Download MIDI');
  await expect(page.locator('#dlXml svg')).toBeVisible();
  await expect(page.locator('#dlMidi')).toHaveAttribute('title', /MIDI file/);
});
