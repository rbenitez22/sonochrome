/* The audio side of playback: the audio context, the clock, and scheduling notes a little ahead.
   Beat 0 is t0 on the audio clock; one beat lasts spb seconds. Suspending the context freezes the
   clock (used while waiting for more symbols). */
import { playNote } from './instruments.js';

// Notes are scheduled this far ahead of the audio clock, in seconds.
const LOOKAHEAD_SEC = 1.5;

let ctx = null, master = null, voiceOut = [], nodes = [], t0 = 0, spb = 0.5;

function context() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume();
  return ctx;
}

// Create and resume the context inside a user gesture, before a long compute, so playback may start after it.
export function unlockAudio() {
  try { context(); } catch (e) {}
}

// Start the clock for nv voices at bpm. Returns false when the browser has no Web Audio.
export function startAudio(nv, bpm) {
  try { context(); } catch (e) { return false; }
  const comp = ctx.createDynamicsCompressor();
  master = ctx.createGain(); master.gain.value = 0.9 / Math.sqrt(nv);
  master.connect(comp); comp.connect(ctx.destination);
  voiceOut = Array.from({ length: nv }, () => { const g = ctx.createGain(); g.connect(master); return g; });
  spb = 60 / bpm;
  t0 = ctx.currentTime + 0.12;
  nodes = [];
  return true;
}

export const secondsPerBeat = () => spb;
// Seconds since beat 0 (negative just before it).
export const elapsed = () => ctx.currentTime - t0;

/* Schedule every note of each voice that starts within the lookahead. sched[k] is the logical index of
   voice k's next unscheduled event, advanced in place; instrumentOf(k) names voice k's instrument. */
export function scheduleNotes(voices, sched, instrumentOf) {
  voices.forEach((vo, k) => {
    while (sched[k] < vo.off + vo.events.length) {
      const e = vo.events[sched[k] - vo.off], st = t0 + e.startBeat * spb;
      if (st > ctx.currentTime + LOOKAHEAD_SEC) break;
      if (!e.rest) playNote(ctx, instrumentOf(k), e.midi, Math.max(st, ctx.currentTime), e.beats * spb, voiceOut[k], nodes);
      sched[k]++;
    }
  });
}

export function suspendAudio() { try { ctx.suspend(); } catch (e) {} }
export function resumeAudio() { try { ctx.resume(); } catch (e) {} }

// Silence everything scheduled and disconnect the mix.
export function stopAudio() {
  nodes.forEach((o) => { try { o.stop(); } catch (e) {} });
  nodes = [];
  if (master) { try { master.disconnect(); } catch (e) {} }
}
