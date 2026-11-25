// Compact field builders shared by all exercise definitions.
import { THINKING_TRAPS } from '../learn.js';

export const rate = (id, label, o = {}) => ({ id, type: 'slider', label, min: 0, max: 10, minLabel: '0', maxLabel: '10', ...o });
export const pct = (id, label, o = {}) => ({ id, type: 'slider', label, min: 0, max: 100, step: 5, minLabel: '0%', maxLabel: '100%', ...o });
export const suds = (id, label, o = {}) => ({ id, type: 'slider', label, min: 0, max: 100, step: 5, minLabel: '0 = calm', maxLabel: '100 = extreme', ...o });
export const text = (id, label, o = {}) => ({ id, type: 'text', label, ...o });
export const long = (id, label, o = {}) => ({ id, type: 'textarea', label, ...o });
export const num = (id, label, o = {}) => ({ id, type: 'number', label, ...o });
export const chips = (id, label, options, o = {}) => ({ id, type: 'chips', label, options, ...o });
export const radio = (id, label, options, o = {}) => ({ id, type: 'radio', label, options, ...o });
export const info = (html, o = {}) => ({ type: 'info', html, ...o });
export const when = (id = 'when', label = 'When?', o = {}) => ({ id, type: 'datetime-local', label, default: () => localNow(), ...o });
export const date = (id = 'date', label = 'Date', o = {}) => ({ id, type: 'date', label, default: () => localNow().slice(0, 10), ...o });
export const traps = (id = 'traps', label = 'Any thinking traps? (optional)') => ({
  id, type: 'chips', label, help: 'Tap any that fit. Hover or long-press for a reminder of what each means.',
  options: THINKING_TRAPS.map((t) => ({ value: t.id, label: t.name, help: t.simple })),
});
export const emotions = (id = 'emotions', label = 'What did you feel? Pick one or more and rate each.') => ({ id, type: 'emotions', label });

export function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export const n = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
export const delta = (a, b) => (n(a) != null && n(b) != null ? b - a : null);
export const short = (s, len = 80) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > len ? s.slice(0, len - 1) + '…' : s; };
export const maxEmotion = (list) => (Array.isArray(list) && list.length ? Math.max(...list.map((e) => n(e.v) ?? 0)) : null);
export const sign = (x) => (x > 0 ? `+${x}` : x < 0 ? `−${Math.abs(x)}` : '±0');
export const change = (label, a, b, unit = '', goodIfDown = true) => {
  const d = delta(a, b);
  if (d == null) return '';
  const good = goodIfDown ? d < 0 : d > 0;
  return `<span class="${d === 0 ? '' : good ? 'kpi-up' : 'kpi-down'}">${label}: ${a}${unit} → ${b}${unit} (${sign(d)}${unit})</span>`;
};
