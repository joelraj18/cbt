// Small, dependency-free statistics used by reports and insights. Pure functions (Node-testable).
import { dayKey, startOfDay, addDays } from '../core/format.js';

export const sum = (a) => a.reduce((s, x) => s + x, 0);
export const mean = (a) => (a.length ? sum(a) / a.length : null);
export function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function sd(a) {
  if (a.length < 2) return null;
  const m = mean(a);
  return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / (a.length - 1));
}
/** Pearson correlation; null if fewer than `minN` pairs or no variance. */
export function pearson(xs, ys, minN = 5) {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < minN) return null;
  const mx = mean(pairs.map((p) => p[0])), my = mean(pairs.map((p) => p[1]));
  let num = 0, dx = 0, dy = 0;
  for (const [x, y] of pairs) { num += (x - mx) * (y - my); dx += (x - mx) ** 2; dy += (y - my) ** 2; }
  if (!dx || !dy) return null;
  return { r: num / Math.sqrt(dx * dy), n: pairs.length };
}
export function describeR(r) {
  const a = Math.abs(r);
  const size = a < 0.1 ? 'no clear' : a < 0.3 ? 'a weak' : a < 0.5 ? 'a moderate' : 'a strong';
  return `${size}${a >= 0.1 ? (r > 0 ? ' positive' : ' negative') : ''} link`;
}
/** Least-squares slope per day for [{x: Date|iso, y}] points. */
export function slopePerDay(points) {
  if (points.length < 3) return null;
  const xs = points.map((p) => new Date(p.x).getTime() / 86400000), ys = points.map((p) => p.y);
  const mx = mean(xs), my = mean(ys);
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den ? num / den : null;
}
/** Group values by calendar day → [{x: Date, y: mean}] */
export function dailyMeans(points) {
  const by = new Map();
  for (const p of points) { const k = dayKey(p.x); if (!by.has(k)) by.set(k, []); by.get(k).push(p.y); }
  return [...by.entries()].sort().map(([k, ys]) => ({ x: new Date(k + 'T12:00:00'), y: mean(ys) }));
}
export function rolling(points, days = 7) {
  return points.map((p) => {
    const t = new Date(p.x).getTime();
    const win = points.filter((q) => { const u = new Date(q.x).getTime(); return u <= t && u > t - days * 86400000; });
    return { x: p.x, y: mean(win.map((q) => q.y)) };
  });
}
/** Distinct active days and current/longest streaks from a list of dates. */
export function streaks(dates, today = new Date()) {
  const days = new Set(dates.map((d) => dayKey(d)));
  let current = 0;
  let d = startOfDay(today);
  if (!days.has(dayKey(d))) d = addDays(d, -1); // today not done yet doesn't break the streak
  while (days.has(dayKey(d))) { current++; d = addDays(d, -1); }
  const sorted = [...days].sort();
  let longest = 0, run = 0, prev = null;
  for (const k of sorted) {
    const cur = new Date(k + 'T12:00:00');
    run = prev && Math.round((cur - prev) / 86400000) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = cur;
  }
  return { activeDays: days.size, current, longest };
}
/** Jacobson & Truax (1991) reliable change: |x2 − x1| > 1.96·√2·SEM, SEM = SD·√(1−r). */
export function reliableChangeThreshold(sdPre, reliability) {
  return 1.96 * Math.sqrt(2) * sdPre * Math.sqrt(1 - reliability);
}
export const round = (x, d = 1) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
