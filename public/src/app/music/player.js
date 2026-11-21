/* The music player page: wires the source, its supply, the controls and the views together.
   The source comes from the hash (play.html#thue-morse); a Series select sets it until the welcome
   page takes over (piece 5). */
import { $, fmtN, fillSelect } from '../dom.js';
import { SOURCES, sourceById } from '../../sources/index.js';
import { createSupply } from '../supply.js';
import { showProgress, hideProgress } from '../progress.js';
import { fmtTime } from '../../mappings/music/timing.js';
import { notesPiece, streamPiece, symbolsFor, PREVIEW_BARS } from './piece.js';
import { initControls, setSource, readSettings, readOverrides, showRows, voiceCount, octaves, voiceLabel, lastDuration } from './controls.js';
import { renderChips, clearChips } from './chips.js';
import { initTabs, restoreTab } from './tabs.js';

let source = null, supply = null, piece = null, pendingNeed = 0, refreshToken = 0, computeTimer = 0;

const sourceFromHash = () => sourceById(decodeURIComponent(location.hash.slice(1))) ?? SOURCES[0];

// ---- status lines ----

// While stopped: how long the piece is.
function updateStatus() {
  const bpm = +$('tempo').value, mode = $('lenMode').value;
  $('status').textContent = mode === 'infinite' ? 'Plays until you press Stop · ' + bpm + ' BPM'
    : mode === 'time' ? fmtTime(lastDuration()) + ' at ' + bpm + ' BPM'
    : Math.round((piece ? piece.totalBeats : 1) * 60 / bpm) + ' sec at ' + bpm + ' BPM';
}

// Which positions the piece reads, under the views.
function showRangeNote() {
  const { s, voices } = piece, nv = voices.length;
  if (!piece.stream) {
    const nEv = voices.reduce((a, v) => a + v.events.length, 0);
    $('rangeNote').textContent = 'Using digits ' + fmtN(s.start) + ' to ' + fmtN(piece.nextPos - 1) + ' of ' + source.name + ', ' + nEv + ' events' +
      (nv > 1 ? ' across ' + nv + ' instruments. Each instrument reads the digits that follow the previous one.' : '.');
    return;
  }
  $('rangeNote').textContent = 'Starting at digit ' + fmtN(s.start) + '. ' +
    (piece.stream.done ? 'The whole piece is shown.' : 'The first ' + PREVIEW_BARS + ' bars are shown; playback keeps reading digits ' + (s.mode === 'time' ? 'until the time is up.' : 'until you press Stop.')) +
    (nv > 1 ? ' In each bar, each instrument reads the digits that follow the previous one.' : '');
}

// The piece needs positions the supply can't prepare without a wait: offer to compute them on Play.
function showPending(need) {
  const est = supply.estimateSeconds(need);
  clearChips();
  $('rangeNote').textContent = 'Digits up to ' + fmtN(need) + ' are not computed yet.';
  $('status').textContent = 'Press Play to compute them' + (est ? ' (about ' + est + ' sec on a laptop, longer on a phone).' : '.');
  pendingNeed = need;
}

// ---- building the piece ----

// Rebuild the piece from the settings. Settings may change while the supply prepares; only the
// latest refresh shows its result.
async function refresh() {
  const token = ++refreshToken;
  const s = readSettings(), nv = voiceCount();
  showRows(s);
  const overrides = readOverrides(s);
  piece = null;
  supply.resetRefill();
  const need = symbolsFor(s, nv);
  const seq = await supply.ready(need);
  if (token !== refreshToken) return;
  if (!seq) { showPending(need); return; }
  pendingNeed = 0;
  piece = s.mode === 'notes' ? notesPiece(s, seq, overrides, octaves()) : streamPiece(s, seq, overrides, octaves());
  showRangeNote();
  renderChips(piece.voices, voiceLabel);
  updateStatus();
}

// ---- computing before playback ----

function endCompute() {
  clearInterval(computeTimer);
  hideProgress();
  $('play').disabled = false;
}

// Foreground compute with a progress bar; resolves true once the positions are there.
async function computeSymbols(need) {
  $('play').disabled = true;
  const startedAt = Date.now();
  let p = 0, label = 'Starting';
  showProgress(p, label, startedAt);
  computeTimer = setInterval(() => showProgress(p, label, startedAt), 500);
  try {
    await supply.compute(need, (pp, l) => { p = pp; label = l; showProgress(p, label, startedAt); });
    endCompute();
    await refresh();
    return true;
  } catch (e) {
    endCompute();
    if (e?.name !== 'AbortError') $('status').textContent = 'Could not compute the digits: ' + (e?.message ?? e);
    return false;
  }
}

function play() {
  if (supply.computing) return;
  if (pendingNeed) computeSymbols(pendingNeed);
}

// ---- the source ----

async function useSource(next) {
  source = next;
  supply = createSupply(source);
  document.title = source.name + ' · Sonochrome';
  $('seriesName').textContent = source.name;
  $('series').value = source.id;
  $('bar').setAttribute('aria-label', 'Computing digits of ' + source.name);
  setSource(source, await supply.ready(1));
  await refresh();
}

// ---- setup ----

fillSelect($('series'), SOURCES.map((s) => [s.id, s.name]));
$('series').addEventListener('change', () => { location.hash = $('series').value; });
window.addEventListener('hashchange', () => useSource(sourceFromHash()));
$('play').addEventListener('click', play);
$('cancel').addEventListener('click', () => {
  supply.cancel();
  $('status').textContent = 'Cancelled. Press Play to try again, or pick a smaller start position.';
});
initControls({
  onChange: refresh,
  onTempoInput: updateStatus,
  onTempoSettled: () => { if ($('lenMode').value !== 'notes') refresh(); },
});
initTabs(() => {});
await useSource(sourceFromHash());
restoreTab();
