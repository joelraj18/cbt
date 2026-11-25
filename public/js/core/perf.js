// Transparent performance + activity log ("what's going on"): every meaningful operation
// is timed and listed in the live panel so users can see exactly what the site is doing.

const now = () => (globalThis.performance?.now ? performance.now() : Date.now());
const listeners = new Set();
const log = [];
const counters = { searches: 0, saves: 0, renders: 0 };
let bootMs = null;
const pending = [];
let scheduled = false;

export const perf = {
  now,
  log,
  counters,
  /** Record an event with optional duration (ms). */
  event(label, ms = null, detail = '') {
    const e = { at: new Date(), label, ms, detail };
    log.push(e);
    if (log.length > 200) log.shift();
    pending.push(e);
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        const batch = pending.splice(0);
        listeners.forEach((fn) => { try { fn(batch.at(-1), batch); } catch (err) { console.warn('perf listener failed', err); } });
      });
    }
    return e;
  },
  /** Time a sync or async function and log it. */
  async time(label, fn, detailFn) {
    const t0 = now();
    const res = await fn();
    const ms = now() - t0;
    this.event(label, ms, detailFn ? detailFn(res) : '');
    return res;
  },
  timeSync(label, fn, detailFn) {
    const t0 = now();
    const res = fn();
    const ms = now() - t0;
    this.event(label, ms, detailFn ? detailFn(res) : '');
    return res;
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  setBoot(ms) { bootMs = ms; },
  get bootMs() { return bootMs; },
  /** Navigation timing from the browser (network + parse). */
  navigation() {
    try {
      const n = performance.getEntriesByType('navigation')[0];
      if (!n) return null;
      return {
        ttfb: n.responseStart - n.startTime,
        domReady: n.domContentLoadedEventEnd - n.startTime,
        load: n.loadEventEnd > 0 ? n.loadEventEnd - n.startTime : null,
        transfer: n.transferSize || 0,
      };
    } catch { return null; }
  },
  resources() {
    try {
      const list = performance.getEntriesByType('resource').filter((r) => r.name.startsWith(location.origin));
      return { count: list.length, bytes: list.reduce((a, r) => a + (r.transferSize || 0), 0) };
    } catch { return { count: 0, bytes: 0 }; }
  },
};
