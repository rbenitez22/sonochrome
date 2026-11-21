/* The symbol supply for one source and its params: the seq the page reads from, and getting more of it.
   - ready(need): the seq if it already reaches `need`, or prepared now when need ≤ source.quickLength
     (no noticeable wait); otherwise null, and the page asks the user to press Play to compute.
   - compute(need, report): the foreground computation before playback, with progress; cancel() stops it.
   - refill(target): a background computation while playing. It never computes on the page (that
     would freeze playback); it fails once, then stays off until resetRefill().
   Shared by the Music tab now and the Colour tab later. */

export function createSupply(source, params = {}) {
  let seq = null, foreground = null, background = null, refillFailed = false;
  const reaches = (need) => seq !== null && seq.length >= need;
  const cap = (n) => Math.min(n, source.maxLength);
  const keep = (next) => { if (!seq || next.length > seq.length) seq = next; return seq; };

  return {
    source,
    params,
    get seq() { return seq; },
    get computing() { return foreground !== null; },
    get refilling() { return background !== null; },
    get refillFailed() { return refillFailed; },

    async ready(need) {
      if (reaches(need)) return seq;
      if (need > (source.quickLength ?? 0)) return null;
      return keep(await source.prepare(params, cap(need)));
    },

    // Rough seconds to compute up to `need`, or null when the source gives no estimate.
    estimateSeconds(need) { return source.estimateSeconds ? source.estimateSeconds(need) : null; },

    async compute(need, report = () => {}) {
      if (reaches(need)) return seq;
      this.stopRefill();
      const controller = new AbortController();
      foreground = controller;
      try { return keep(await source.prepare(params, cap(need), report, { signal: controller.signal })); }
      finally { if (foreground === controller) foreground = null; }
    },

    cancel() { if (foreground) { foreground.abort(); foreground = null; } },

    // Resolves true when the seq grew, false when nothing was started or the refill failed or stopped.
    async refill(target) {
      target = cap(target);
      if (foreground || background || refillFailed || reaches(target)) return false;
      const controller = new AbortController();
      background = controller;
      try {
        keep(await source.prepare(params, target, () => {}, { signal: controller.signal, allowInline: false }));
        return true;
      } catch (e) {
        if (e?.name !== 'AbortError') refillFailed = true;
        return false;
      } finally { if (background === controller) background = null; }
    },

    stopRefill() { if (background) { background.abort(); background = null; } },

    resetRefill() { refillFailed = false; },
  };
}
