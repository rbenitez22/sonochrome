// The instruments a voice can play, synthesised with the Web Audio API.

// [id, label] in menu order.
export const INSTRUMENTS = [
  ['piano','Piano'], ['organ','Organ'], ['harp','Harp'], ['marimba','Marimba'], ['bells','Bells'],
  ['flute','Flute'], ['strings','Strings'], ['guitar','Guitar'], ['euphonium','Euphonium'], ['bass','Bass'], ['lead','Square lead'], ['sine','Pure sine']
];

// General MIDI program (1-based) per instrument, for MusicXML export; nearest patch where GM has none.
export const GM_PROGRAM = { piano:1, organ:20, harp:47, marimba:13, bells:15, flute:74, strings:49, guitar:25, euphonium:59, bass:33, lead:81, sine:80 };

export const instrumentLabel = (id) => (INSTRUMENTS.find((i) => i[0] === id) || [0, ''])[1];

// The organ's waveform, made once per audio context.
const organWaves = new WeakMap();
function getOrgan(ctx) {
  if (!organWaves.has(ctx)) organWaves.set(ctx, ctx.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, 0.5, 0.35, 0.25, 0.12])));
  return organWaves.get(ctx);
}
// [peak, attack, decay time constant (0 = sustain), release time constant]
const ENV = {
  piano: [0.5, 0.004, 0.55, 0.09], organ: [0.26, 0.02, 0, 0.05], harp: [0.5, 0.003, 0.4, 0.18],
  marimba: [0.6, 0.002, 0.14, 0.05], bells: [0.3, 0.002, 1.0, 0.5], flute: [0.4, 0.06, 0, 0.06],
  strings: [0.2, 0.12, 0, 0.14], guitar: [0.6, 0.002, 0, 0.15], euphonium: [0.32, 0.06, 0, 0.08], bass: [0.65, 0.01, 0.5, 0.07], lead: [0.16, 0.01, 0, 0.05], sine: [0.4, 0.01, 0, 0.05]
};
// Karplus-Strong plucked string, rendered once per pitch and cached.
const ksCache = {};
function ksBuffer(ctx, midi) {
  const sr = ctx.sampleRate, key = midi + '@' + sr;
  if (ksCache[key]) return ksCache[key];
  const f = 440 * Math.pow(2, (midi - 69) / 12), N = Math.max(2, Math.round(sr / f)), len = Math.floor(sr * 2.5);
  const buf = ctx.createBuffer(1, len, sr), y = buf.getChannelData(0);
  let seed = midi * 7919 + 13;
  for (let i = 0; i < N; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; y[i] = seed / 2147483648 - 1; }
  for (let i = N; i < len; i++) y[i] = 0.497 * (y[i - N] + y[i - N + 1]);
  return (ksCache[key] = buf);
}
/* Play one note on instrument `inst` at audio time t for d seconds, into node `out`.
   Every source node started is pushed to `nodes` (and removed when it ends), so stop can silence them. */
export function playNote(ctx, inst, midi, t, d, out, nodes) {
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const os = [];
  const osc = (type, fr, det) => {
    const o = ctx.createOscillator();
    if (type === 'organ') o.setPeriodicWave(getOrgan(ctx)); else o.type = type;
    o.frequency.value = fr;
    if (det) o.detune.value = det;
    os.push(o);
    return o;
  };
  const g = ctx.createGain();
  g.connect(out);
  const to = (o, level, dest) => { if (level === 1) o.connect(dest); else { const x = ctx.createGain(); x.gain.value = level; o.connect(x); x.connect(dest); } };
  const lp = (fc) => { const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = fc; b.connect(g); return b; };
  switch (inst) {
    case 'piano': to(osc('triangle', f), 1, g); to(osc('sine', 2 * f), 0.3, g); to(osc('sine', 3 * f), 0.1, g); break;
    case 'organ': to(osc('organ', f), 1, g); break;
    case 'harp': { const b = lp(Math.min(f * 9, 12000)); b.frequency.setTargetAtTime(Math.min(f * 1.6, 8000), t, 0.12); to(osc('sawtooth', f), 1, b); break; }
    case 'marimba': to(osc('sine', f), 1, g); to(osc('sine', 4 * f), 0.12, g); break;
    case 'bells': to(osc('sine', f), 1, g); to(osc('sine', 2.76 * f), 0.35, g); to(osc('sine', 5.4 * f), 0.15, g); break;
    case 'flute': {
      const o = osc('sine', f); to(o, 1, g); to(osc('sine', 2 * f), 0.08, g);
      const lfo = osc('sine', 5.3), lg = ctx.createGain(); lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency);
      break;
    }
    case 'strings': { const b = lp(2000); to(osc('sawtooth', f, -7), 1, b); to(osc('sawtooth', f, 7), 1, b); break; }
    case 'bass': { const b = lp(1200); to(osc('triangle', f), 1, b); to(osc('sine', 2 * f), 0.25, b); break; }
    case 'guitar': { const sr = ctx.createBufferSource(); sr.buffer = ksBuffer(ctx, midi); os.push(sr); to(sr, 1, g); break; }
    case 'euphonium': {
      const b = lp(f * 2); b.frequency.setTargetAtTime(Math.min(f * 6, 5000), t, 0.09);
      const o = osc('sawtooth', f); to(o, 1, b); to(osc('triangle', f), 0.6, g);
      const lfo = osc('sine', 5), lg = ctx.createGain(); lg.gain.value = f * 0.004; lfo.connect(lg); lg.connect(o.frequency);
      break;
    }
    case 'lead': to(osc('square', f), 1, lp(2600)); break;
    default: to(osc('sine', f), 1, g);
  }
  const [peak, a, tau, rel] = ENV[inst] || ENV.sine;
  const hold = Math.max(d, a + 0.01);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  if (tau) g.gain.setTargetAtTime(0, t + a, tau);
  g.gain.setTargetAtTime(0, t + hold, rel);
  os.forEach((o) => {
    o.start(t); o.stop(t + hold + rel * 6 + 0.03);
    nodes.push(o);
    o.onended = () => { const i = nodes.indexOf(o); if (i >= 0) nodes.splice(i, 1); };
  });
}
