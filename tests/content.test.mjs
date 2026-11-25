// Content integrity: every exercise is complete, every citation exists, every form is valid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, EXERCISE_BY_ID } from '../public/js/data/exercises/index.js';
import { AREAS, LEVELS } from '../public/js/data/areas.js';
import { research } from '../public/js/data/research.js';
import { ASSESSMENTS } from '../public/js/data/assessments.js';
import { EVIDENCE_POINTS, THINKING_TRAPS, TRAP_QUIZ, GLOSSARY, CBT_GUIDE } from '../public/js/data/learn.js';
import { CRISIS_LINES } from '../public/js/data/resources.js';
import { COURSE_REFS } from '../public/js/data/courses.js';
import { readFileSync } from 'node:fs';

/** Research ids cited in a source file via cite('id') or refs: ['id', …]. */
const citedIn = (file) => { const src = readFileSync(new URL(file, import.meta.url), 'utf8'); return [...src.matchAll(/cite\('([^']+)'\)/g)].map((m) => m[1]).concat([...src.matchAll(/refs:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]))).concat([...src.matchAll(/\[('[a-z0-9-]+'(?:,\s*'[a-z0-9-]+')+)\]\.filter\(\(id\) => REF_BY_ID/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]))); };

const REF = new Set(research.map((r) => r.id));
const FIELD_TYPES = new Set(['text', 'textarea', 'number', 'slider', 'select', 'radio', 'chips', 'checklist', 'checkbox', 'date', 'time', 'datetime-local', 'list', 'emotions', 'info', 'computed', 'tracker']);
const WIDGETS = new Set(['trap-quiz', 'ladder', 'worry-list', 'matrix', 'habits', 'breathing', 'pmr', 'focus', 'tmt', 'values']);

test('seven areas, each fully specified', () => {
  assert.equal(AREAS.length, 7);
  for (const a of AREAS) {
    for (const k of ['name', 'simple', 'signs', 'cycle', 'howCbtHelps', 'facts', 'myths', 'getHelp', 'startHere', 'order', 'checkin']) assert.ok(a[k], `${a.id}.${k}`);
    for (const k of ['situation', 'thought', 'feeling', 'body', 'behaviour', 'result']) assert.ok(a.cycle[k] && a.cycle.better[k] || k === 'situation', `${a.id} cycle ${k}`);
    [...a.order, ...a.startHere].forEach((id) => assert.ok(EXERCISE_BY_ID[id], `${a.id} → ${id}`));
    [...a.facts, ...a.myths].forEach((f) => assert.ok(REF.has(f.ref), `${a.id} ref ${f.ref}`));
    EXERCISES.filter((e) => e.area === a.id).forEach((e) => assert.ok(a.order.includes(e.id), `${a.id} order is missing ${e.id}`));
  }
});

test('exercise ids are unique and every exercise is complete', () => {
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
  assert.ok(EXERCISES.length >= 55);
  for (const e of EXERCISES) {
    for (const k of ['title', 'tagline', 'simple', 'why', 'steps', 'example', 'tips', 'science', 'refs', 'frequency']) assert.ok(e[k], `${e.id}.${k}`);
    assert.ok(LEVELS[e.level], `${e.id} level`);
    assert.ok(e.steps.length >= 3, `${e.id} steps`);
    assert.ok(e.refs.length >= 1, `${e.id} refs`);
    e.refs.forEach((r) => assert.ok(REF.has(r), `${e.id} cites missing ${r}`));
    assert.ok(e.form || e.widget, `${e.id} needs a form or widget`);
    if (e.widget) assert.ok(WIDGETS.has(e.widget), `${e.id} unknown widget ${e.widget}`);
    if (!e.tool) { assert.equal(typeof e.summarize, 'function', `${e.id}.summarize`); assert.equal(typeof e.metrics, 'function', `${e.id}.metrics`); }
  }
});

test('exercise forms are valid and their functions tolerate empty data', () => {
  for (const e of EXERCISES.filter((x) => x.form)) {
    const steps = e.form.steps || [{ fields: e.form.fields }];
    const ids = new Set();
    for (const s of steps) for (const f of s.fields) {
      assert.ok(FIELD_TYPES.has(f.type), `${e.id}: unknown field type ${f.type}`);
      if (!['info'].includes(f.type)) { assert.ok(f.id, `${e.id}: field without id`); assert.ok(!ids.has(f.id), `${e.id}: duplicate field ${f.id}`); ids.add(f.id); }
      if (['radio', 'select', 'checklist'].includes(f.type)) assert.ok(f.options?.length, `${e.id}.${f.id} options`);
      if (f.type === 'list') assert.ok(f.fields?.length, `${e.id}.${f.id} sub-fields`);
      if (f.type === 'computed') assert.doesNotThrow(() => f.compute({}), `${e.id}.${f.id} compute`);
      if (f.showIf) assert.doesNotThrow(() => f.showIf({}), `${e.id}.${f.id} showIf`);
    }
    assert.doesNotThrow(() => e.summarize({}), `${e.id}.summarize({})`);
    assert.doesNotThrow(() => e.metrics({}), `${e.id}.metrics({})`);
    if (e.calendar) assert.ok(Array.isArray(e.calendar({})), `${e.id}.calendar`);
    if (e.feedback) assert.ok(Array.isArray(e.feedback({}, e.metrics({}))), `${e.id}.feedback`);
    if (e.insight) assert.doesNotThrow(() => e.insight([]), `${e.id}.insight`);
  }
});

test('research library: every reference is complete and verified', () => {
  assert.equal(new Set(research.map((r) => r.id)).size, research.length);
  assert.ok(research.length >= 180);
  for (const r of research) {
    for (const k of ['title', 'year', 'type', 'finding', 'simple', 'areas', 'authors', 'verified']) assert.ok(r[k], `${r.id}.${k}`);
    assert.ok(r.year >= 1960 && r.year <= 2026, `${r.id} year`);
    if (r.doi) assert.match(r.doi, /^10\.\d{4,9}\/\S+$/, `${r.id} DOI format`);
    assert.ok(r.doi || r.url || r.publisher || r.journal, `${r.id} needs a source`);
  }
  assert.ok(research.filter((r) => r.doi).length >= 160);
});

test('every reference in the library is actually used somewhere', () => {
  const cited = new Set([...EXERCISES.flatMap((e) => e.refs), ...AREAS.flatMap((a) => [...a.facts, ...a.myths].map((f) => f.ref).concat(a.definitionRef || [])), ...ASSESSMENTS.flatMap((s) => s.refs), ...EVIDENCE_POINTS.flatMap((p) => p.refs), 'stanley2012', 'stanley2018',
    ...COURSE_REFS, ...['../public/js/lib/therapy.js', '../public/js/views/course.js', '../public/js/views/standards.js'].flatMap(citedIn)]);
  const unused = research.filter((r) => !cited.has(r.id)).map((r) => r.id);
  assert.deepEqual(unused, []);
});

test('learning content is consistent', () => {
  assert.equal(THINKING_TRAPS.length, 12);
  const trapIds = new Set(THINKING_TRAPS.map((t) => t.id));
  TRAP_QUIZ.forEach((q) => { assert.ok(trapIds.has(q.answer), q.thought); (q.also || []).forEach((a) => assert.ok(trapIds.has(a))); });
  assert.ok(GLOSSARY.length >= 30);
  assert.ok(CBT_GUIDE.length >= 6);
  EVIDENCE_POINTS.forEach((p) => p.refs.forEach((r) => assert.ok(REF.has(r), r)));
});

test('crisis resources are present for major regions', () => {
  const regions = CRISIS_LINES.map((c) => c.region).join(' ');
  for (const r of ['United States', 'Canada', 'United Kingdom', 'Australia', 'India', 'Worldwide']) assert.ok(regions.includes(r), r);
  assert.ok(CRISIS_LINES.some((c) => c.contact.includes('988')));
  assert.ok(CRISIS_LINES.every((c) => /^https:\/\//.test(c.url)));
});
