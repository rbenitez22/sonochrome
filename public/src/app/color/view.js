/* The Colour view of the player page (see app/play.js): the series' symbols as an image of coloured
   cells, read from the Series panel's start position. Rebuilt on every change, as in the prototype;
   past the source's quickLength, the Compute button computes first. */
import { $, fmtN } from '../dom.js';
import { unitWord, unitWords, UnitWords } from '../unit.js';
import { readStart } from '../start.js';
import { fitSize, buildCells, symbolsNeeded } from '../../mappings/color/image.js';
import { initColorControls, readImageSettings, readoutFormat, showSize, showHint, setModesFor, refreshPills } from './controls.js';
import { drawCells, clearCanvas, cellAt } from './canvas.js';
import { clearReadout, showReadout, showDigitsUsed, showColorList, clearLists } from './lists.js';
import { copyColors, downloadPng } from './export.js';

// page: the player page (its compute()). image: the cells shown, { cells, order, w, h, start, mode }.
let page = null, source = null, supply = null, image = null, pendingNeed = 0, refreshToken = 0, initialised = false;

const status = (text) => { $('colorStatus').textContent = text; };

// The image needs positions the supply can't prepare without a wait: offer Compute.
function showPending(need) {
  const est = supply.estimateSeconds(need);
  image = null;
  clearCanvas();
  clearLists();
  clearReadout(unitWords(source));
  $('compute').hidden = false;
  status(UnitWords(source) + ' up to ' + fmtN(need) + ' are not computed yet. Press Compute' +
    (est ? ' (about ' + est + ' sec on a laptop, longer on a phone).' : '.'));
  pendingNeed = need;
}

// Rebuild the image from the settings; only the latest of overlapping refreshes shows its result.
async function refresh() {
  const token = ++refreshToken;
  const s = readImageSettings(), start = readStart();
  showHint(s.mode);
  const fit = fitSize(s.w, s.h, s.mode.dpc, start, source.maxLength);
  showSize(fit.w, fit.h);
  const need = symbolsNeeded(start, fit.w, fit.h, s.mode.dpc);
  const seq = await supply.ready(need);
  if (token !== refreshToken) return;
  if (!seq) { showPending(need); refreshPills(); return; }
  pendingNeed = 0;
  $('compute').hidden = true;
  image = { ...buildCells(seq, start, fit.w, fit.h, s.mode, s.order), w: fit.w, h: fit.h, start, mode: s.mode };
  drawCells(image, s.px);
  const cv = $('cv'), used = fit.w * fit.h * s.mode.dpc;
  status(`${fit.w}×${fit.h} cells · ${used} ${unitWords(source)} used (positions ${start}–${start + used - 1}) · canvas ${cv.width}×${cv.height}px` +
    (fit.reduced ? ` (size reduced to fit the available ${unitWords(source)})` : ''));
  showDigitsUsed(seq, start, need);
  showColorList(image, s.format);
  refreshPills();
}

async function compute() {
  if (!pendingNeed || supply.computing) return;
  if (await page.compute(pendingNeed)) await refresh();
}

function inspect(ev) {
  if (!image) return;
  const hit = cellAt(ev, image);
  // "digits 314159265", but "term 42" when a cell reads a single position.
  if (hit) showReadout(hit, readoutFormat(), image.mode.dpc === 1 ? unitWord(source) : unitWords(source));
}

function init() {
  initialised = true;
  initColorControls({ onChange: refresh, onFormatChange: () => { if (image) showColorList(image, readoutFormat()); } });
  $('cv').addEventListener('mousemove', inspect);
  $('cv').addEventListener('click', inspect);
  $('cv').addEventListener('touchstart', inspect, { passive: true });
  $('compute').addEventListener('click', compute);
  $('copy').addEventListener('click', async () => { if (image) status(await copyColors(image, readoutFormat())); });
  $('savePng').addEventListener('click', async () => {
    if (!image) return;
    const message = await downloadPng(`${source.id}-${image.start}-${image.mode.id}-${image.w}x${image.h}`);
    if (message) status(message);
  });
}

export function createColorView(thePage) {
  page = thePage;
  if (!initialised) init();
  return {
    name: 'color',
    computeVerb: 'Compute',
    // A new source: modes it refuses are disabled (probe: a short seq of it, for its base).
    setSource(next, nextSupply, probe) {
      source = next;
      supply = nextSupply;
      setModesFor(source, probe);
      $('digitsHead').textContent = UnitWords(source) + ' used';
      clearReadout(unitWords(source));
    },
    refresh,
    show() { return refresh(); },
    hide() {},
    status,
  };
}
