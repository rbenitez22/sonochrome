/* The score: VexFlow (global Vex, loaded by play.html) draws the piece as sheet music, one system row
   per voice. Note elements are kept per voice and logical event index, for highlighting the playing
   notes. While streaming, the score shows one page of PAGE_BARS bars at a time. */
import { $ } from '../dom.js';
import { NAMES } from '../../mappings/music/theory.js';
import { toMeasures, measuresInRange, chooseClef } from '../../mappings/music/measures.js';
import { isShown } from './tabs.js';

const PAGE_BARS = 8;
// VexFlow durations by length in beats.
const DUR = { 4:'w', 3:'hd', 2:'h', 1.5:'qd', 1:'q', 0.75:'8d', 0.5:'8', 0.25:'16' };

let sheetEls = [], renderedPage = -1, dirty = false;
/* Draw the score for the piece: Notes mode, the whole piece; Time/Infinite, the PAGE_BARS-bar page
   that holds `atBeat`. clefSetting is 'auto', 'treble' or 'bass'. VexFlow needs a real width, so
   while the Sheet music tab is hidden this only marks the score as out of date. */
export function renderScore(piece, clefSetting, atBeat) {
  const box = $('sheet');
  box.innerHTML = '';
  const voices = piece ? piece.voices : [];
  sheetEls = voices.map(() => new Map());
  if (!voices.length) return;
  if (!isShown('sheet')) { dirty = true; return; }
  dirty = false;
  const V = window.Vex && window.Vex.Flow;
  if (!V) { box.innerHTML = '<p class="msg">The notation library did not load. Check your connection, then reload the page.</p>'; return; }
  try {
    const nv = voices.length;
    const clefs = voices.map((vo) => chooseClef(vo.events, clefSetting));
    // Notes mode: the whole piece. Time/Infinite: the 8-bar page holding the playhead.
    let bars;
    if (piece.stream) {
      renderedPage = pageOf(atBeat);
      const from = renderedPage * PAGE_BARS * 4;
      bars = voices.map((vo) => measuresInRange(vo.events, from, from + PAGE_BARS * 4, vo.off));
    } else bars = voices.map((vo) => toMeasures(vo.events));
    const nBars = Math.max(...bars.map((b) => b.length));
    if (!nBars) { box.innerHTML = '<p class="msg">No notes to show.</p>'; return; }
    bars.forEach((b) => { while (b.length < nBars) b.push([{ ei: -1, rest: true, midi: null, beats: 4, tie: false }]); });
    const need = [];
    for (let b = 0; b < nBars; b++) need.push(Math.max(72, 26 + 22 * Math.max(...bars.map((vb) => vb[b].length))));
    const avail = Math.max(240, (box.clientWidth || 340) - 8);
    const systems = [];
    let cur = [], w = 0;
    for (let b = 0; b < nBars; b++) {
      let extra = cur.length ? 0 : 42 + (systems.length ? 0 : 26);
      if (cur.length && w + need[b] + extra > avail) { systems.push(cur); cur = []; w = 0; extra = 42; }
      cur.push(b); w += need[b] + extra;
    }
    if (cur.length) systems.push(cur);
    const rowH = 104, sysH = nv * rowH + 14;
    const H = systems.length * sysH + 16;
    const cs = getComputedStyle(document.documentElement);
    const ink = cs.getPropertyValue('--ink').trim() || '#000';
    const renderer = new V.Renderer(box, V.Renderer.Backends.SVG);
    renderer.resize(avail + 8, H);
    const c = renderer.getContext();
    c.setFillStyle(ink); c.setStrokeStyle(ink);
    const drawn = voices.map(() => []);
    systems.forEach((sys, si) => {
      const nat = sys.map((b, i) => need[b] + (i === 0 ? 42 + (si === 0 ? 26 : 0) : 0));
      const sum = nat.reduce((a, b) => a + b, 0);
      const scale = si === systems.length - 1 ? Math.min(1, avail / sum) : avail / sum;
      let x = 4;
      sys.forEach((b, bi) => {
        const bw = nat[bi] * scale;
        const staves = [];
        for (let v = 0; v < nv; v++) {
          const st = new V.Stave(x, si * sysH + v * rowH + 30, bw);
          if (bi === 0) { st.addClef(clefs[v]); if (si === 0) st.addTimeSignature('4/4'); }
          st.setContext(c).draw();
          staves.push(st);
          const notes = bars[v][b].map((p) => {
            const key = p.rest ? (clefs[v] === 'bass' ? 'd/3' : 'b/4') : NAMES[p.midi % 12].toLowerCase() + '/' + (Math.floor(p.midi / 12) - 1);
            const n = new V.StaveNote({ keys: [key], duration: DUR[p.beats] + (p.rest ? 'r' : ''), clef: clefs[v] });
            if (p.beats === 3 || p.beats === 1.5 || p.beats === 0.75) V.Dot.buildAndAttach([n], { all: true });
            drawn[v].push({ note: n, ei: p.ei, tie: p.tie, si });
            return n;
          });
          const voice = new V.Voice({ num_beats: 4, beat_value: 4 }).setMode(V.Voice.Mode.SOFT).addTickables(notes);
          V.Accidental.applyAccidentals([voice], 'C');
          // Beams must exist before the notes draw, or beamed notes also draw their own flags.
          const beams = V.Beam.generateBeams(notes);
          new V.Formatter().joinVoices([voice]).format([voice], Math.max(30, st.getNoteEndX() - st.getNoteStartX() - 14));
          voice.draw(c, st);
          beams.forEach((bm) => bm.setContext(c).draw());
        }
        if (nv > 1) {
          const T = V.StaveConnector.type;
          new V.StaveConnector(staves[0], staves[nv - 1]).setType(T.SINGLE_RIGHT).setContext(c).draw();
          if (bi === 0) {
            new V.StaveConnector(staves[0], staves[nv - 1]).setType(T.SINGLE_LEFT).setContext(c).draw();
            new V.StaveConnector(staves[0], staves[nv - 1]).setType(nv === 2 ? T.BRACE : T.BRACKET).setContext(c).draw();
          }
        }
        x += bw;
      });
    });
    drawn.forEach((list, v) => {
      list.forEach((p) => {
        if (p.ei < 0) return;
        const el = p.note.getSVGElement && p.note.getSVGElement();
        if (el) { if (!sheetEls[v].has(p.ei)) sheetEls[v].set(p.ei, []); sheetEls[v].get(p.ei).push(el); }
      });
      for (let i = 0; i < list.length - 1; i++) {
        const p = list[i], q = list[i + 1];
        if (!p.tie) continue;
        const tie = (a, b) => new V.StaveTie({ first_note: a, last_note: b, first_indices: [0], last_indices: [0] }).setContext(c).draw();
        if (p.si === q.si) tie(p.note, q.note); else { tie(p.note, null); tie(null, q.note); }
      }
    });
  } catch (err) {
    box.innerHTML = '<p class="msg">Could not draw the score: ' + String(err && err.message || err) + '</p>';
  }
}

// The streaming page that holds `beat`, and the page drawn last (-1 before any).
export const pageOf = (beat) => Math.floor(beat / (4 * PAGE_BARS));
export const renderedScorePage = () => renderedPage;
// True when the score changed while hidden (or was never drawn), so showing it must redraw.
export const scoreIsDirty = () => dirty;
export const markScoreDirty = () => { dirty = true; };
// Forget the drawn page, so the next page check redraws (a new piece starts at page 0).
export const resetScorePage = () => { renderedPage = -1; };

// Show a message instead of a score.
export function showScoreMessage(text) {
  $('sheet').innerHTML = '<p class="msg">' + text + '</p>';
  sheetEls = [];
  dirty = false;
}

// Highlight (or un-highlight) the notes of voice k's event idx.
export function setScoreNoteOn(k, idx, on) {
  ((sheetEls[k] && sheetEls[k].get(idx)) || []).forEach((el) => el.classList.toggle('on', on));
}

// Keep the playing note of voice 1 in view inside the score's scroll box.
export function scrollScoreTo(idx) {
  const els = sheetEls[0] && sheetEls[0].get(idx);
  if (!els || !els.length) return;
  const box = $('sheet'), r = els[0].getBoundingClientRect(), br = box.getBoundingClientRect();
  if (r.top < br.top || r.bottom > br.bottom) box.scrollTop += r.top - br.top - box.clientHeight / 3;
}
