/* The Music view of the player page (see app/play.js): wires the music controls, the chips, roll and
   score, and the transport, for the source and supply the page hands over. */
import { $, fmtN } from '../dom.js';
import { unitWord, unitWords, UnitWords } from '../unit.js';
import { fmtTime } from '../../mappings/music/timing.js';
import {
  notesPiece, streamPiece, fillStream, trimPlayed, eventAt, playedRange, symbolsFor, refillTarget, PREVIEW_BARS,
} from './piece.js';
import {
  initControls, setSchemesFor, readSettings, readOverrides, showRows, voiceCount, octaves, voiceLabel, instrumentOf,
  lastDuration, clefSetting,
} from './controls.js';
import { randomizeStart, randomEachPlay } from '../start.js';
import { renderChips, clearChips, appendChips, removeChips, setChipOn, scrollChipIntoView } from './chips.js';
import { initTabs, restoreTab, isShown } from './tabs.js';
import { drawRoll } from './roll.js';
import {
  renderScore, showScoreMessage, setScoreNoteOn, scrollScoreTo, pageOf, renderedScorePage, scoreIsDirty,
  markScoreDirty, resetScorePage,
} from './score.js';
import { updateDownload, downloadMusicXML } from './download.js';
import { GM_PROGRAM } from './instruments.js';
import {
  unlockAudio, startAudio, secondsPerBeat, elapsed, scheduleNotes, suspendAudio, resumeAudio, stopAudio,
} from './transport.js';

// While streaming, bars are generated this many beats ahead of the playhead.
const AHEAD_BEATS = 48;
// How often playback generates bars and schedules notes, in ms.
const PUMP_MS = 150;

// page: the player page (its compute()); visible: whether this view is shown.
let page = null, visible = false, source = null, supply = null, piece = null, pendingNeed = 0, refreshToken = 0;
// Playback state. total: seconds the piece lasts (Infinity for Infinite). lastOn[k]: the logical index
// of voice k's sounding event (-1 for none). sched[k]: its next unscheduled event.
let playing = false, waiting = false, streamUsed = false, raf = 0, timer = 0, total = 0, endReason = '', lastSec = -1;
let lastOn = [], sched = [], playedBeats = 0, lastPlayed = null;
// The beat the score and roll follow (where playback is, or stopped), and the score width drawn last.
let sheetBeat = 0, lastW = 0;

// Beats played so far in the current run (live while playing).
const beatsPlayed = () => (playing ? Math.max(0, elapsed() / secondsPerBeat()) : playedBeats);

// ---- status lines ----

// While stopped: how long the piece is.
function updateStatus() {
  const bpm = +$('tempo').value, mode = $('lenMode').value;
  $('status').textContent = mode === 'infinite' ? 'Plays until you press Stop · ' + bpm + ' BPM'
    : mode === 'time' ? fmtTime(lastDuration()) + ' at ' + bpm + ' BPM'
    : Math.round((piece ? piece.totalBeats : 1) * 60 / bpm) + ' sec at ' + bpm + ' BPM';
}

// While playing: "0:12 / 1:00 · digit 1,234" (or "0:12 · ∞").
function showPlayStatus(el) {
  const e = eventAt(piece, 0, lastOn[0]);
  $('status').textContent = fmtTime(el) + (total === Infinity ? ' · ∞' : ' / ' + fmtTime(total)) + (e ? ' · ' + unitWord(source) + ' ' + fmtN(e.at) : '') +
    (waiting ? ' · waiting for more ' + unitWords(source) + '…' : supply.refilling ? ' · computing more ' + unitWords(source) : '');
}

// After stopping: why it stopped early, if it did, and which positions played.
function showStoppedStatus() {
  if (!lastPlayed) return;
  $('status').textContent = (endReason === 'digits' ? 'Stopped: no more computed ' + unitWords(source) + '. ' : endReason === 'ceiling' ? 'Stopped at the ' + fmtN(source.maxLength) + '-' + unitWord(source) + ' limit. ' : '') +
    'Played ' + unitWords(source) + ' ' + fmtN(lastPlayed.start) + '–' + fmtN(lastPlayed.end) + ' (' + fmtTime(lastPlayed.seconds) + ').';
}

// Which positions the piece reads, under the views.
function showRangeNote() {
  const { s, voices } = piece, nv = voices.length;
  if (!piece.stream) {
    const nEv = voices.reduce((a, v) => a + v.events.length, 0);
    $('rangeNote').textContent = 'Using ' + unitWords(source) + ' ' + fmtN(s.start) + ' to ' + fmtN(piece.nextPos - 1) + ' of ' + source.name + ', ' + nEv + ' events' +
      (nv > 1 ? ' across ' + nv + ' instruments. Each instrument reads the ' + unitWords(source) + ' that follow the previous one.' : '.');
    return;
  }
  $('rangeNote').textContent = 'Starting at ' + unitWord(source) + ' ' + fmtN(s.start) + '. ' +
    (piece.stream.done ? 'The whole piece is shown.' : 'The first ' + PREVIEW_BARS + ' bars are shown; playback keeps reading ' + unitWords(source) + ' ' + (s.mode === 'time' ? 'until the time is up.' : 'until you press Stop.')) +
    (nv > 1 ? ' In each bar, each instrument reads the ' + unitWords(source) + ' that follow the previous one.' : '');
}

// The piece needs positions the supply can't prepare without a wait: offer to compute them on Play.
function showPending(need) {
  const est = supply.estimateSeconds(need);
  clearChips();
  showScoreMessage('The score appears once the ' + unitWords(source) + ' are computed.');
  drawRoll(null, null, -1);
  $('rangeNote').textContent = UnitWords(source) + ' up to ' + fmtN(need) + ' are not computed yet.';
  $('status').textContent = 'Press Play to compute them' + (est ? ' (about ' + est + ' sec on a laptop, longer on a phone).' : '.');
  pendingNeed = need;
}

// ---- building the piece ----

// Rebuild the piece from the settings. Settings may change while the supply prepares; only the
// latest refresh shows its result.
async function refresh() {
  if (playing) stop();
  const token = ++refreshToken;
  const s = readSettings(), nv = voiceCount();
  showRows(s);
  const overrides = readOverrides(s);
  piece = null;
  streamUsed = false;
  playedBeats = 0;
  sheetBeat = 0;
  resetScorePage();
  updateDownload(null, false, 0);
  supply.resetRefill();
  const need = symbolsFor(s, nv);
  const seq = await supply.ready(need);
  if (token !== refreshToken) return;
  if (!seq) { showPending(need); return; }
  pendingNeed = 0;
  piece = s.mode === 'notes' ? notesPiece(s, seq, overrides, octaves()) : streamPiece(s, seq, overrides, octaves());
  lastOn = piece.voices.map(() => -1);
  showRangeNote();
  renderChips(piece.voices, voiceLabel);
  updateDownload(piece, false, 0);
  updateStatus();
  renderScore(piece, clefSetting(), sheetBeat);
  drawRoll(piece, null, -1);
}

// ---- background refill (Time/Infinite) ----
// A source computed from position 0 can't continue from an offset, so a refill recomputes in the
// background while the music plays on, well before the generator reaches the end of the seq.

function maybeRefill() {
  if (supply.refilling || supply.refillFailed || supply.computing || !piece.stream || piece.stream.done) return;
  const target = refillTarget(piece, supply.seq.length, source.maxLength);
  if (!target) return;
  supply.refill(target).then((grew) => {
    if (!grew || !piece || !piece.stream) return;
    piece.stream.out = false;
    resumeAfterWait();
  });
}

// The generator caught up with the seq while a refill runs: freeze the audio clock.
function waitForSymbols(el) {
  waiting = true;
  suspendAudio();
  showPlayStatus(el);
}

function resumeAfterWait() {
  if (!waiting || !playing) return;
  waiting = false;
  pump();  // generate and schedule the new bars before the clock moves again
  resumeAudio();
}

// No more symbols and no refill coming: end where the generated music ends.
function endAtGenerated() {
  const end = Math.max(...piece.voices.map((v) => v.total)) * secondsPerBeat();
  if (end < total) { total = end; endReason = supply.seq.length >= source.maxLength ? 'ceiling' : 'digits'; }
}

// ---- playback ----

// Every PUMP_MS: generate bars ahead and drop old ones (Time/Infinite), then schedule notes.
function pump() {
  if (!playing) return;
  if (piece.stream) {
    const beat = elapsed() / secondsPerBeat();
    appendChips(fillStream(piece, supply.seq, beat + AHEAD_BEATS));
    removeChips(trimPlayed(piece, beat, piece.voices.map((_, k) => Math.min(sched[k], lastOn[k]))));
    maybeRefill();
    if (piece.stream.out && !supply.refilling) endAtGenerated();
  }
  scheduleNotes(piece.voices, sched, instrumentOf);
}

function setOn(k, idx, on) {
  setChipOn(k, idx, on);
  setScoreNoteOn(k, idx, on);
}

const highlightPlaying = () => piece.voices.forEach((_, k) => setOn(k, lastOn[k], true));

// Streaming: redraw the score when the playhead enters the next page.
function turnScorePage(beat) {
  if (pageOf(beat) === renderedScorePage()) return;
  if (!isShown('sheet')) { markScoreDirty(); return; }
  renderScore(piece, clefSetting(), beat);
  highlightPlaying();
  scrollScoreTo(lastOn[0]);
}

// Every animation frame: follow the playhead in the views, and stop at the end.
function tick() {
  if (!playing) return;
  const el = elapsed();
  if (el >= total + 0.2) { stop(); return; }
  const beat = Math.max(0, el / secondsPerBeat());
  piece.voices.forEach((vo, k) => {
    let idx = -1;
    // Time only moves forward, so search from the current event (event lists grow while streaming).
    for (let i = Math.max(vo.off, lastOn[k]); i < vo.off + vo.events.length; i++) {
      const e = vo.events[i - vo.off];
      if (beat >= e.startBeat && beat < e.startBeat + e.beats) { idx = i; break; }
    }
    if (idx !== lastOn[k]) {
      setOn(k, lastOn[k], false);
      setOn(k, idx, true);
      scrollChipIntoView(k, idx);
      if (k === 0) scrollScoreTo(idx);
      lastOn[k] = idx;
    }
  });
  sheetBeat = beat;
  if (piece.stream) turnScorePage(beat);
  if (piece.stream && piece.stream.out && supply.refilling && !waiting && beat >= piece.stream.genEnd - 0.1) waitForSymbols(el);
  if (Math.floor(el) !== lastSec) { lastSec = Math.floor(el); showPlayStatus(el); }
  if (isShown('roll')) drawRoll(piece, lastOn, beat);
  raf = requestAnimationFrame(tick);
}

// Start audio for the piece refresh() built.
async function startPlayback() {
  // A stream is consumed by playing it; rebuild the preview so every Play starts at the start position.
  if (streamUsed) { await refresh(); if (pendingNeed) return; }
  if (!piece || !piece.voices.some((v) => v.events.length)) return;
  if (!startAudio(piece.voices.length, piece.s.bpm)) { $('status').textContent = 'Audio is not available in this browser.'; return; }
  total = (piece.stream ? piece.stream.limit : piece.totalBeats) * secondsPerBeat();
  endReason = '';
  lastSec = -1;
  streamUsed = !!piece.stream;
  sched = piece.voices.map(() => 0);
  lastOn = piece.voices.map(() => -1);
  playing = true;
  updateDownload(piece, true, 0);
  pump();
  timer = setInterval(pump, PUMP_MS);
  $('play').textContent = 'Stop';
  raf = requestAnimationFrame(tick);
}

function stop() {
  if (playing) {
    playedBeats = beatsPlayed();
    const range = playedRange(piece, playedBeats);
    // The record a future history store keeps: which source, params and settings played which positions.
    lastPlayed = range && { ...range, seconds: playedBeats * secondsPerBeat(), source: source.id, params: supply.params, settings: piece.s,
      voices: piece.voices.map((_, k) => ({ inst: instrumentOf(k), oct: piece.octs[k] })) };
  }
  playing = false;
  waiting = false;
  cancelAnimationFrame(raf);
  clearInterval(timer);
  stopAudio();
  if (piece) piece.voices.forEach((_, k) => setOn(k, lastOn[k], false));
  lastOn = piece ? piece.voices.map(() => -1) : [];
  $('play').textContent = 'Play';
  updateDownload(piece, false, playedBeats);
  showStoppedStatus();
  drawRoll(piece, null, -1, sheetBeat);
}

// Play button: toggle; optionally re-randomise the start; compute symbols first if needed.
async function play() {
  if (playing) { stop(); return; }
  if (supply.computing) return;
  if (randomEachPlay()) { randomizeStart(); await refresh(); }
  if (pendingNeed) {
    unlockAudio();
    if (await page.compute(pendingNeed)) { await refresh(); if (!pendingNeed) startPlayback(); }
    return;
  }
  startPlayback();
}

// ---- views ----

const playhead = () => (playing ? elapsed() / secondsPerBeat() : -1);

// Bring a newly shown view up to date (views are not drawn while hidden).
function onTabShown(name) {
  if (name === 'roll') drawRoll(piece, playing ? lastOn : null, playhead(), sheetBeat);
  if (name === 'sheet') {
    const w = $('sheet').clientWidth;
    if (scoreIsDirty() || w !== lastW) {
      lastW = w;
      renderScore(piece, clefSetting(), sheetBeat);
      if (playing) highlightPlaying();
    }
  }
}

function saveMusicXML() {
  if (!piece) return;
  const saved = downloadMusicXML(piece, supply.seq, beatsPlayed(), {
    sourceId: source.id, sourceName: source.name, units: unitWords(source), bpm: +$('tempo').value, clefSetting: clefSetting(),
    parts: piece.voices.map((_, k) => ({ name: voiceLabel(k), program: GM_PROGRAM[instrumentOf(k)] || 1 })),
  });
  if (!saved) $('status').textContent = 'Could not rebuild the score: the ' + unitWords(source) + ' it needs are not computed.';
}

// Redraw the roll and (when stopped) the score after the window settles at a new size.
let resizeTimer = 0;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    drawRoll(piece, playing ? lastOn : null, playhead(), sheetBeat);
    const w = $('sheet').clientWidth;
    if (w !== lastW && !playing) { lastW = w; renderScore(piece, clefSetting(), sheetBeat); }
  }, 150);
}

// The theme changed: the canvas and the score take their colours from it.
function recolor() {
  if (playing) return;
  renderScore(piece, clefSetting(), sheetBeat);
  drawRoll(piece, null, -1, sheetBeat);
}

// ---- the view ----

let initialised = false;
function init() {
  initialised = true;
  $('play').addEventListener('click', play);
  initControls({
    onChange: refresh,
    onTempoInput: () => { if (playing) stop(); updateStatus(); },
    onTempoSettled: () => { if ($('lenMode').value !== 'notes') refresh(); },
  });
  $('dlXml').addEventListener('click', saveMusicXML);
  window.addEventListener('resize', () => { if (visible) onResize(); });
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (visible) recolor(); }); } catch (e) {}
  new MutationObserver(() => { if (visible) recolor(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  initTabs(onTabShown);
  restoreTab();
}

export function createMusicView(thePage) {
  page = thePage;
  return {
    name: 'music',
    computeVerb: 'Play',
    // A new source: schemes it refuses are disabled (probe: a short seq of it, for its base).
    setSource(next, nextSupply, probe) {
      if (playing) stop();
      source = next;
      supply = nextSupply;
      setSchemesFor(source, probe);
    },
    refresh,
    async show() {
      if (!initialised) init();
      visible = true;
      await refresh();
      lastW = $('sheet').clientWidth;
    },
    hide() {
      visible = false;
      if (playing) stop();
    },
    status(text) { $('status').textContent = text; },
  };
}
