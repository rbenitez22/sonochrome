// Module worker that computes a constant's digits from position 0.
// Request: { constant, count }. Replies { p, l } progress messages, then { done, engine } or { error, engine }.
// GMP (WebAssembly) does the big-number arithmetic when it loads: no size cap in any browser, and as
// fast as or faster than BigInt. If it can't load, the BigInt engine runs instead.
import { chudnovsky, chudnovskyGmp } from '../sources/pi.js';

const GMP_URL = 'https://cdn.jsdelivr.net/npm/gmp-wasm@1.3.2/dist/index.esm.js';

// Engines per constant: bigint(count, report) and gmp(binding, count, report), each returning the digit string.
const ENGINES = {
  pi: { bigint: chudnovsky, gmp: chudnovskyGmp },
};

let gmp = null;
function loadGmp() {
  gmp ??= import(GMP_URL).then((m) => m.init()).catch(() => null);
  return gmp;
}

const post = (message) => self.postMessage(message);

function run(engine, compute) {
  try { post({ done: compute(), engine }); }
  catch (e) { post({ error: String(e?.message ?? e), engine }); }
}

self.onmessage = async ({ data: { constant, count } }) => {
  const engines = ENGINES[constant];
  if (!engines) { post({ error: `unknown constant ${constant}`, engine: 'none' }); return; }
  post({ p: 0, l: 'Loading GMP' });
  const g = await loadGmp();
  if (g) run('gmp', () => engines.gmp(g.binding, count, (p, l) => post({ p, l: l + ' · GMP' })));
  else run('bigint', () => engines.bigint(count, (p, l) => post({ p, l })));
};
