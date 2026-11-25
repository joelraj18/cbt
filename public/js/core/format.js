// Formatting helpers (dates, numbers, durations). Pure functions — safe to import in Node tests.

const DAY = 86400000;

export const toDate = (d) => (d instanceof Date ? d : new Date(d));
export const dayKey = (d) => { const x = toDate(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export const startOfDay = (d) => { const x = new Date(toDate(d)); x.setHours(0, 0, 0, 0); return x; };
export const addDays = (d, n) => { const x = new Date(toDate(d)); x.setDate(x.getDate() + n); return x; };
export const startOfWeek = (d) => { const x = startOfDay(d); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); }; // Monday

export function fmtDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  try { return new Intl.DateTimeFormat(undefined, opts).format(toDate(d)); } catch { return dayKey(d); }
}
export const fmtDay = (d) => fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (d) => fmtDate(d, { hour: 'numeric', minute: '2-digit' });
export const fmtDateTime = (d) => fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function relTime(d, now = Date.now()) {
  const diff = toDate(d).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }) : null;
  const units = [['year', 365 * DAY], ['month', 30 * DAY], ['week', 7 * DAY], ['day', DAY], ['hour', 3600000], ['minute', 60000]];
  for (const [u, ms] of units) {
    if (abs >= ms) { const v = Math.round(diff / ms); return rtf ? rtf.format(v, u) : `${Math.abs(v)} ${u}${Math.abs(v) === 1 ? '' : 's'} ${v < 0 ? 'ago' : 'from now'}`; }
  }
  return 'just now';
}

export function fmtNum(n, digits = 0) {
  if (n == null || Number.isNaN(n)) return '–';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
export const fmtMs = (ms) => (ms == null ? '–' : ms < 1 ? `${ms.toFixed(2)} ms` : ms < 100 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`);
export function fmtBytes(b) {
  if (b == null) return '–';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
export function fmtDuration(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
export const plural = (n, one, many = one + 's') => `${fmtNum(n)} ${n === 1 ? one : many}`;
export const pct = (x, digits = 0) => (x == null || Number.isNaN(x) ? '–' : `${(x * 100).toFixed(digits)}%`);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
export const signed = (n, digits = 0) => (n == null ? '–' : (n > 0 ? '+' : n < 0 ? '−' : '±') + fmtNum(Math.abs(n), digits));
