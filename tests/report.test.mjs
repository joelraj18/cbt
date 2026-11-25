import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, reportSteps, exerciseFindings } from '../public/js/lib/report.js';
import { EXERCISE_BY_ID } from '../public/js/data/exercises/index.js';
import { sleepCalc } from '../public/js/data/exercises/depression.js';
import { mean, median, pearson, streaks, slopePerDay, dailyMeans } from '../public/js/lib/stats.js';
import { buildICS } from '../public/js/lib/ics.js';

const day = (n, h = 12) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const rec = (kind, type, data, n, metrics) => ({ id: Math.random().toString(36).slice(2), kind, type, area: EXERCISE_BY_ID[type]?.area ?? null, data, metrics: metrics ?? (EXERCISE_BY_ID[type]?.metrics(data) || {}), createdAt: day(n) });

const records = [
  rec('assessment', 'phq9', { answers: [2, 2, 2, 2, 2, 2, 2, 1, 0] }, 25),
  rec('assessment', 'phq9', { answers: [1, 1, 1, 1, 1, 1, 0, 0, 0] }, 2),
  rec('mood', 'mood', { mood: 3, anxiety: 6 }, 20, { mood: 3 }),
  rec('mood', 'mood', { mood: 7, anxiety: 3 }, 1, { mood: 7 }),
  rec('exercise', 'thought-record', { emotions: [{ name: 'Sad', v: 80 }], after: 40, beliefBefore: 80, beliefAfter: 30 }, 10),
  rec('exercise', 'thought-record', { emotions: [{ name: 'Anxious', v: 70 }], after: 40, beliefBefore: 70, beliefAfter: 40 }, 5),
  rec('exercise', 'sleep-diary', { bed: '23:00', up: '07:00', latency: 30, awake: 30 }, 3),
  rec('exercise', 'estimate-vs-actual', { task: 'a', estimate: 60, actual: 90 }, 4),
  rec('exercise', 'estimate-vs-actual', { task: 'b', estimate: 30, actual: 60 }, 3),
  rec('exercise', 'urge-surfing', { urge: 'shop', outcome: 'Rode it out', wave: { elapsed: 600, points: [{ t: 0, v: 8 }, { t: 300, v: 4 }, { t: 600, v: 2 }] } }, 2),
];

test('report pipeline exposes named, timeable steps', () => {
  const steps = reportSteps(records, { days: 30 });
  assert.equal(steps.length, 7);
  steps.forEach((s) => { assert.equal(typeof s.label, 'string'); assert.equal(typeof s.run(), 'string'); });
});

test('report overview counts entries, practice and areas', () => {
  const r = buildReport(records, { days: 30 });
  assert.equal(r.overview.entries, records.length);
  assert.equal(r.overview.checkins, 2);
  assert.equal(r.overview.moods, 2);
  assert.equal(r.overview.exercises, 6);
  assert.equal(r.overview.byArea.depression, 3);
});

test('questionnaire trends detect reliable improvement and recovery', () => {
  const r = buildReport(records, { days: 30 });
  const t = r.trends.find((x) => x.id === 'phq9');
  assert.equal(t.first, 15); assert.equal(t.last, 6);
  assert.equal(t.change.reliable, true); assert.equal(t.change.recovered, true);
  assert.ok(r.insights.some((i) => i.tone === 'good' && /reliable improvement/.test(i.text)));
});

test('exercise findings compute meaningful numbers', () => {
  const f = exerciseFindings(records);
  const tr = f.find((x) => x.type === 'thought-record');
  assert.equal(tr.value, 35); // (80-40 + 70-40) / 2
  const pf = f.find((x) => x.type === 'estimate-vs-actual');
  assert.equal(pf.value, 1.75); // median(1.5, 2)
  const sl = f.find((x) => x.type === 'sleep-diary');
  assert.equal(sl.value, 88);
  assert.ok(f.find((x) => x.type === 'urge-surfing'));
});

test('period filter excludes older entries', () => {
  const r = buildReport(records, { days: 7 });
  assert.equal(r.overview.checkins, 1);
});

test('empty data produces a helpful starting insight', () => {
  const r = buildReport([], { days: 30 });
  assert.equal(r.insights.length, 1);
  assert.match(r.insights[0].text, /No entries/);
});

test('sleep efficiency calculation (CBT-I)', () => {
  assert.deepEqual(sleepCalc({ bed: '23:00', up: '07:00', latency: 30, awake: 30 }), { tib: 8, tst: 7, se: 88 });
  assert.equal(sleepCalc({ bed: '01:00', up: '09:00', latency: 0, awake: 0 }).se, 100);
  assert.equal(sleepCalc({}), null);
});

test('statistics helpers', () => {
  assert.equal(mean([1, 2, 3]), 2);
  assert.equal(median([5, 1, 3, 2]), 2.5);
  assert.ok(Math.abs(pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]).r - 1) < 1e-9);
  assert.equal(pearson([1, 2], [3, 4]), null);
  const s = streaks([day(0), day(1), day(2), day(5)]);
  assert.equal(s.current, 3); assert.equal(s.longest, 3); assert.equal(s.activeDays, 4);
  assert.ok(slopePerDay([{ x: day(3), y: 1 }, { x: day(2), y: 2 }, { x: day(1), y: 3 }]) > 0.9);
  assert.equal(dailyMeans([{ x: day(1, 9), y: 2 }, { x: day(1, 18), y: 4 }])[0].y, 3);
});

test('calendar export produces valid iCalendar with recurrence', () => {
  const ics = buildICS([{ title: 'CBT practice: Thought record, with comma', start: '2026-12-01T19:00', minutes: 15, rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' }]);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261201T190000/);
  assert.match(ics, /DTEND:20261201T191500/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR/);
  assert.match(ics, /SUMMARY:CBT practice: Thought record\\, with comma/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  ics.split('\r\n').forEach((l) => assert.ok(l.length <= 75, `line too long: ${l}`));
});
