// Runs a constant's digit computation in the module worker workers/digits.js, off the page's thread.
// Used by sources that are computed from position 0 (constants). Browser only for the worker path;
// without Worker support (or in Node) it runs the caller's `inline` engine on this thread instead.

const WORKER_URL = new URL('../workers/digits.js', import.meta.url);

function abortError() {
  return new DOMException('The computation was cancelled.', 'AbortError');
}

// The raw BigInt size-cap message is cryptic; say what to do about it.
function explainEngineError(message, engine) {
  if (engine === 'bigint' && /too large|maximum bigint|out of memory/i.test(message)) {
    return "couldn't load the GMP library, and this browser can only compute about 150,000 digits without it. Check your connection and try again, or use Chrome or Edge.";
  }
  return message;
}

// Run inline(count) on this thread after a short pause, so a progress message can paint first.
function computeInline(count, inline, report, signal) {
  return new Promise((resolve, reject) => {
    report(0, 'Computing (this page may pause)');
    setTimeout(() => {
      if (signal?.aborted) { reject(abortError()); return; }
      try { resolve(inline(count)); }
      catch (e) { reject(new Error(explainEngineError(String(e?.message ?? e), 'bigint'))); }
    }, 60);
  });
}

function computeInWorker(constant, count, inline, report, signal, allowInline) {
  return new Promise((resolve, reject) => {
    let settled = false, gotProgress = false, worker;
    try { worker = new Worker(WORKER_URL, { type: 'module' }); }
    catch (e) {
      if (allowInline) computeInline(count, inline, report, signal).then(resolve, reject);
      else reject(new Error('background tasks are not available'));
      return;
    }
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      signal?.removeEventListener('abort', onAbort);
      fn(value);
    };
    const onAbort = () => settle(reject, abortError());
    signal?.addEventListener('abort', onAbort);
    worker.onmessage = ({ data }) => {
      if (data.done !== undefined) settle(resolve, data.done);
      else if (data.error !== undefined) settle(reject, new Error(explainEngineError(data.error, data.engine)));
      else { gotProgress = true; report(data.p, data.l); }
    };
    worker.onerror = () => {
      if (gotProgress || !allowInline) { settle(reject, new Error('the background task stopped')); return; }
      // The worker never started (e.g. module workers unsupported): fall back to this thread.
      settled = true;
      worker.terminate();
      signal?.removeEventListener('abort', onAbort);
      computeInline(count, inline, report, signal).then(resolve, reject);
    };
    worker.postMessage({ constant, count });
  });
}

/* Compute `count` digit characters of `constant` (a name the worker knows, e.g. 'pi').
   report(p, label) receives progress 0..1. `inline(count)` is the same computation on this thread,
   used when workers are unavailable and allowInline is true. Resolves with the digit string. */
export function computeConstant(constant, count, { inline, report = () => {}, signal, allowInline = true } = {}) {
  if (signal?.aborted) return Promise.reject(abortError());
  if (typeof Worker === 'undefined') {
    return allowInline ? computeInline(count, inline, report, signal) : Promise.reject(new Error('background tasks are not available'));
  }
  return computeInWorker(constant, count, inline, report, signal, allowInline);
}
