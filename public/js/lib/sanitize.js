// Validate and normalise an imported backup before it touches the database.
// Backups are user files and could be edited or crafted, so nothing in them is trusted:
// unknown kinds/types are dropped, values are coerced to the types the forms expect,
// prototype keys are removed, sizes are capped, and metrics are recomputed by our own code.
import { EXERCISE_BY_ID } from '../data/exercises/index.js';
import { ASSESSMENT_BY_ID } from '../data/assessments.js';
import { COURSE_BY_ID } from '../data/courses.js';

const KINDS = new Set(['exercise', 'assessment', 'mood', 'session', 'daily', 'course']);
const KV_KEY = /^(tool:(ladders|habits|matrix|worries)|plan|safety-plan|daily-settings|program|program-history|course|course-history)$/;
const MAX_STRING = 20000, MAX_ARRAY = 500, MAX_KEYS = 200, MAX_DEPTH = 6;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const toNum = (v) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

export function cleanValue(v, depth = 0) {
  if (v == null || depth > MAX_DEPTH) return null;
  if (typeof v === 'string') return v.slice(0, MAX_STRING);
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.slice(0, MAX_ARRAY).map((x) => cleanValue(x, depth + 1));
  if (typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v).slice(0, MAX_KEYS)) if (!BAD_KEYS.has(k)) o[String(k).slice(0, 80)] = cleanValue(x, depth + 1);
    return o;
  }
  return null;
}

function coerceFields(fields, data) {
  for (const f of fields || []) {
    if (!f.id || !(f.id in data)) continue;
    const v = data[f.id];
    if (f.type === 'slider' || f.type === 'number') data[f.id] = toNum(v);
    else if (f.type === 'checkbox') data[f.id] = v === true;
    else if (['chips', 'checklist'].includes(f.type)) data[f.id] = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    else if (f.type === 'emotions') data[f.id] = Array.isArray(v) ? v.filter((e) => e && typeof e.name === 'string').map((e) => ({ name: e.name.slice(0, 40), v: toNum(e.v) ?? 0 })) : [];
    else if (f.type === 'tracker') data[f.id] = v && typeof v === 'object' ? { start: typeof v.start === 'string' ? v.start : null, elapsed: toNum(v.elapsed) ?? 0, points: (Array.isArray(v.points) ? v.points : []).map((p) => ({ t: toNum(p?.t) ?? 0, v: toNum(p?.v) ?? 0 })) } : { points: [] };
    else if (f.type === 'list') data[f.id] = (Array.isArray(v) ? v : []).filter((row) => row && typeof row === 'object').map((row) => { coerceFields(f.fields, row); return row; });
    else if (['text', 'textarea', 'select', 'radio', 'date', 'time', 'datetime-local'].includes(f.type)) data[f.id] = v == null ? '' : typeof v === 'string' ? v : String(v);
  }
}

/** Returns { data: cleanBackup, report: { kept, dropped, kv } } or throws if the file is not a backup. */
export function sanitizeBackup(input) {
  if (!input || input.app !== 'cbt-toolkit' || !Array.isArray(input.records)) throw new Error('This file is not a CBT Toolkit backup.');
  const report = { kept: 0, dropped: 0, kv: 0 };
  const records = [];
  const seen = new Set();
  for (const r of input.records) {
    const created = new Date(r?.createdAt);
    const kind = typeof r?.kind === 'string' ? r.kind : '';
    const type = typeof r?.type === 'string' ? r.type.slice(0, 60) : '';
    const ok = r && typeof r === 'object' && typeof r.id === 'string' && r.id.length <= 100 && !seen.has(r.id)
      && KINDS.has(kind) && type && !Number.isNaN(created.getTime())
      && ((kind !== 'exercise' && kind !== 'session') || EXERCISE_BY_ID[type])
      && (kind !== 'assessment' || ASSESSMENT_BY_ID[type])
      && (kind !== 'course' || type === 'session');
    if (!ok) { report.dropped++; continue; }
    seen.add(r.id);
    const data = cleanValue(r.data) || {};
    let metrics = {};
    if (kind === 'exercise' || kind === 'session') {
      const ex = EXERCISE_BY_ID[type];
      const steps = ex.form?.steps || (ex.form?.fields ? [{ fields: ex.form.fields }] : []);
      coerceFields(steps.flatMap((s) => s.fields), data);
      try { metrics = ex.metrics ? ex.metrics(data) || {} : {}; } catch { metrics = {}; }
    } else if (kind === 'assessment') {
      const a = ASSESSMENT_BY_ID[type];
      data.answers = (Array.isArray(data.answers) ? data.answers : []).slice(0, a.items.length).map((x) => (x == null ? null : toNum(x)));
      data.extra = toNum(data.extra);
    } else if (kind === 'course') {
      data.n = toNum(data.n);
      for (const k of ['helpful', 'safety']) if (k in data) data[k] = toNum(data[k]);
      if (!COURSE_BY_ID[data.course] || !(data.n >= 1 && data.n <= 8)) { report.dropped++; seen.delete(r.id); continue; }
      metrics = { helpful: data.helpful ?? null, adherence: toNum(r.metrics?.adherence) };
    } else if (kind === 'mood') {
      for (const k of ['mood', 'anxiety', 'energy', 'sleep']) if (k in data) data[k] = toNum(data[k]);
      for (const k of ['emotions', 'activities']) data[k] = Array.isArray(data[k]) ? data[k].filter((x) => typeof x === 'string') : [];
      metrics = { mood: data.mood ?? null, anxiety: data.anxiety ?? null, energy: data.energy ?? null, sleep: data.sleep ?? null };
    }
    records.push({ id: r.id, kind, type, area: typeof r.area === 'string' ? r.area.slice(0, 40) : null, createdAt: created.toISOString(),
      updatedAt: Number.isNaN(new Date(r.updatedAt).getTime()) ? created.toISOString() : new Date(r.updatedAt).toISOString(), data, metrics });
    report.kept++;
  }
  const kv = (Array.isArray(input.kv) ? input.kv : []).filter((k) => k && typeof k.key === 'string' && KV_KEY.test(k.key)).map((k) => ({ key: k.key, value: cleanValue(k.value) }));
  report.kv = kv.length;
  return { data: { app: 'cbt-toolkit', format: 1, exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : null, records, kv }, report };
}
