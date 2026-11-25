import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURSES, COURSE_BY_ID, MAINTAINERS, SUITABILITY, SESSION_COUNT, COURSE_REFS } from '../public/js/data/courses.js';
import { sessionPlan, triage, courseProgress, outcome, courseAlerts, homeworkStatus, sessionReminderEvents, boosterEvents, answersFrom, measureSeries, goalProgress } from '../public/js/lib/therapy.js';
import { recommend } from '../public/js/lib/coach.js';
import { EXERCISE_BY_ID } from '../public/js/data/exercises/index.js';
import { ASSESSMENT_BY_ID } from '../public/js/data/assessments.js';
import { AREA_BY_ID } from '../public/js/data/areas.js';
import { research } from '../public/js/data/research.js';
import { buildICS } from '../public/js/lib/ics.js';
import { sanitizeBackup } from '../public/js/lib/sanitize.js';

const REF = new Set(research.map((r) => r.id));
const NOW = new Date('2026-11-26T10:00:00');
const ago = (days, h = 10) => { const d = new Date(NOW); d.setDate(d.getDate() - days); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const phq = (answers, days) => ({ id: 'p' + days + answers.join(''), kind: 'assessment', type: 'phq9', data: { answers }, createdAt: ago(days) });
const gad = (answers, days) => ({ id: 'g' + days + answers.join(''), kind: 'assessment', type: 'gad7', data: { answers }, createdAt: ago(days) });
const ex = (type, days, h = 12) => ({ id: type + days + h, kind: 'exercise', type, data: {}, createdAt: ago(days, h) });
const sessions = (...daysAgo) => Object.fromEntries(daysAgo.map((d, i) => [i + 1, { at: ago(d), rec: 's' + (i + 1) }]));

test('seven complete courses, each with five evidence-linked skill sessions', () => {
  assert.equal(COURSES.length, 7);
  assert.equal(SESSION_COUNT, 8);
  for (const c of COURSES) {
    assert.ok(AREA_BY_ID[c.area], c.id);
    assert.ok(ASSESSMENT_BY_ID[c.primary], `${c.id} primary`);
    c.checkpoints.forEach((id) => assert.ok(ASSESSMENT_BY_ID[id], `${c.id} checkpoint ${id}`));
    assert.ok(EXERCISE_BY_ID[c.monitoring.ex], `${c.id} monitoring`);
    assert.ok(c.warningSigns.length >= 4, `${c.id} warning signs`);
    assert.equal(c.modules.length, 5, c.id);
    for (const m of c.modules) {
      assert.ok(m.title && m.learn.length > 120 && m.example.length > 40, `${c.id}: ${m.title} text`);
      assert.equal(m.questions.length, 2, `${c.id}: ${m.title} questions`);
      assert.ok(EXERCISE_BY_ID[m.ex], `${c.id}: ${m.title} → ${m.ex}`);
      assert.ok(m.homework.length >= 1);
      m.homework.forEach(([id, n]) => { assert.ok(EXERCISE_BY_ID[id], `${c.id}: homework ${id}`); assert.ok(n >= 1 && n <= 7); });
      assert.ok(m.refs.length >= 1, `${c.id}: ${m.title} refs`);
    }
  }
  MAINTAINERS.forEach((m) => m.ex.forEach((id) => assert.ok(EXERCISE_BY_ID[id], `maintainer ${m.id} → ${id}`)));
  assert.deepEqual(COURSE_REFS.filter((id) => !REF.has(id)), []);
  assert.ok(SUITABILITY.some((s) => s.urgent));
});

test('session plans follow assessment → map → skills → staying well, with the right measures', () => {
  const p1 = sessionPlan('depression', 1), p2 = sessionPlan('depression', 2), p4 = sessionPlan('depression', 4), p8 = sessionPlan('depression', 8);
  assert.deepEqual([p1.stage, p2.stage, sessionPlan('depression', 3).stage, p8.stage], ['assessment', 'map', 'module', 'ending']);
  assert.deepEqual(p1.measures, ['phq9', 'gad7', 'impact']);
  assert.deepEqual(p2.measures, ['phq9']);
  assert.deepEqual(p4.measures, ['phq9', 'gad7', 'impact']);
  assert.equal(p2.safetyQuestion, false);
  // a course whose main measure is not the PHQ-9 asks the self-harm question on its own every week
  const a3 = sessionPlan('anxiety', 3), t1 = sessionPlan('time-management', 1);
  assert.deepEqual(a3.measures, ['gad7']);
  assert.equal(a3.safetyQuestion, true);
  assert.deepEqual(t1.measures, ['phq9', 'gad7', 'checkin-time-management', 'impact']);
  assert.equal(sessionPlan('depression', 9), null);
  assert.equal(sessionPlan('nope', 1), null);
});

test('stepped-care recommendation follows NICE thresholds and the guided-vs-unguided evidence', () => {
  assert.equal(triage({ phq9: [0, 0, 0, 0, 0, 0, 0, 0, 1] }).level, 'urgent');
  assert.equal(triage({ phq9: [0, 0, 0, 0, 0, 0, 0, 0, 0], suitability: ['suicide-plan'] }).level, 'urgent');
  assert.equal(triage({ phq9: [2, 2, 2, 2, 2, 2, 2, 2, 0] }).level, 'professional'); // 16 = NICE "more severe"
  assert.equal(triage({ phq9: [2, 2, 2, 2, 2, 2, 2, 1, 0] }).level, 'guided'); // 15
  assert.equal(triage({ gad7: [3, 3, 3, 3, 3, 0, 0] }).level, 'professional'); // 15
  assert.equal(triage({ phq9: [1, 1, 1, 1, 1, 1, 1, 1, 0], gad7: [1, 1, 1, 1, 1, 1, 1] }).level, 'self'); // 8 and 7
  assert.equal(triage({ phq9: [0, 0, 0, 0, 0, 0, 0, 0, 0], suitability: ['mania'] }).level, 'professional');
  const t = triage({ phq9: [2, 2, 2, 2, 1, 1, 1, 1, 0] });
  assert.equal(t.level, 'guided');
  assert.ok(t.refs.includes('karyotaki2021') && t.refs.every((id) => REF.has(id)));
  assert.match(t.reasons[0], /PHQ-9 12 of 27/);
});

test('weekly pacing, going on early, and practice counted since the last session', () => {
  const st = { id: 'depression', start: ago(20), sessions: sessions(20, 13, 4), homework: [{ ex: 'activity-scheduling', perWeek: 4 }, { ex: 'rumination-to-action', perWeek: 3 }] };
  const recs = [ex('activity-scheduling', 3), ex('activity-scheduling', 2), ex('activity-scheduling', 5) /* before session 3 */, ex('rumination-to-action', 1)];
  const p = courseProgress(st, recs, NOW);
  assert.equal(p.next, 4);
  assert.equal(p.completed, 3);
  assert.equal(p.due, false);
  assert.equal(p.daysUntilDue, 2);
  assert.equal(p.homework.done, 3);
  assert.equal(p.homework.target, 7);
  assert.equal(courseProgress({ ...st, early: true }, recs, NOW).due, true);
  const later = new Date(NOW); later.setDate(later.getDate() + 2);
  assert.equal(courseProgress(st, recs, later).due, true);
  assert.equal(courseProgress({ id: 'depression', start: ago(0), sessions: {} }, [], NOW).due, true);
  const done = courseProgress({ ...st, sessions: sessions(60, 50, 40, 30, 20, 15, 10, 1) }, recs, NOW);
  assert.equal(done.finished, true);
  assert.equal(done.next, null);
  assert.equal(courseProgress(null, [], NOW), null);
  assert.equal(homeworkStatus([{ ex: 'nope', perWeek: 3 }], recs, ago(10)).items.length, 0);
});

test('outcomes use NHS Talking Therapies reliable change and recovery', () => {
  assert.equal(outcome('phq9', 15, 8).status, 'recovered');
  assert.equal(outcome('phq9', 22, 14).status, 'improved');
  assert.equal(outcome('phq9', 8, 14).status, 'deteriorated');
  assert.equal(outcome('phq9', 12, 9).status, 'no-reliable-change');
  assert.equal(outcome('gad7', 12, 7).status, 'recovered');
  assert.equal(outcome('gad7', 12, 9).status, 'no-reliable-change');
});

test('safety and not-on-track alerts', () => {
  const base = { id: 'anxiety', start: ago(40) };
  // weekly safety question answered above 0 in a recent session
  const safetyRec = { id: 'c1', kind: 'course', type: 'session', data: { course: 'anxiety', n: 3, safety: 1 }, createdAt: ago(2) };
  assert.equal(courseAlerts({ ...base, sessions: sessions(20, 10, 2) }, [safetyRec], NOW)[0].id, 'risk');
  // reliable deterioration of the main measure
  const worse = [gad([1, 1, 1, 1, 1, 1, 0], 30), gad([2, 2, 2, 2, 1, 1, 0], 3)];
  assert.ok(courseAlerts({ ...base, sessions: sessions(30, 20, 10) }, worse, NOW).some((a) => a.id === 'deterioration'));
  // no reliable change after 5 sessions, starting in the clinical range
  const flat = [gad([2, 2, 1, 1, 1, 1, 1], 35), gad([2, 1, 1, 1, 1, 1, 1], 28), gad([2, 2, 1, 1, 1, 1, 0], 21), gad([1, 2, 1, 1, 1, 1, 1], 14), gad([2, 2, 1, 1, 1, 1, 1], 7)];
  const al = courseAlerts({ ...base, sessions: sessions(35, 28, 21, 14, 7) }, flat, NOW);
  assert.ok(al.some((a) => a.id === 'not-improving'));
  // severe PHQ-9 during the course
  assert.ok(courseAlerts({ ...base, sessions: sessions(5) }, [phq([2, 2, 2, 2, 2, 2, 2, 2, 0], 1)], NOW).some((a) => a.id === 'severe'));
  // all alert sources exist in the research library
  [...al, ...courseAlerts({ ...base, sessions: sessions(20, 10, 2) }, [safetyRec], NOW)].forEach((a) => a.refs.forEach((id) => assert.ok(REF.has(id), id)));
  assert.deepEqual(courseAlerts({ ...base, sessions: sessions(5) }, [gad([0, 0, 0, 0, 0, 0, 0], 5)], NOW), []);
});

test('today’s suggestions put a due session, review alerts and course practice first', () => {
  const st = { id: 'depression', start: ago(30), sessions: sessions(30, 23, 14), homework: [{ ex: 'activity-scheduling', perWeek: 4 }] };
  const recs = [phq([1, 1, 1, 1, 1, 1, 1, 1, 0], 30), phq([2, 2, 2, 2, 2, 2, 1, 1, 0], 14)];
  const r = recommend({ records: recs, now: NOW, courseState: st, limit: 5 });
  assert.equal(r[0].kind, 'review');
  assert.equal(r[1].kind, 'course');
  assert.equal(r[1].href, '#/course/session');
  assert.ok(r.some((x) => x.key === 'activity-scheduling' && /CBT course/.test(x.reason)));
  const risky = recommend({ records: [{ id: 'c', kind: 'course', type: 'session', data: { course: 'depression', n: 3, safety: 2 }, createdAt: ago(1) }], now: NOW, courseState: st });
  assert.equal(risky[0].kind, 'help');
});

test('calendar reminders for weekly sessions and check-ups after the course', () => {
  const st = { id: 'anxiety', start: ago(20), sessions: sessions(20, 13, 4), sessionDay: 4, sessionTime: '19:30' };
  const ev = sessionReminderEvents(st, 'https://cbt.example.com/#/course', NOW);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].rrule, 'FREQ=WEEKLY;COUNT=5');
  assert.equal(new Date(ev[0].start).getDay(), 4);
  assert.ok(new Date(ev[0].start) >= new Date(ago(-2)));
  const ics = buildICS([...ev, ...boosterEvents(NOW, 'https://cbt.example.com/#/course')]);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 4);
  assert.match(ics, /RRULE:FREQ=WEEKLY;COUNT=5/);
  assert.match(ics, /DTSTART:20261226T180000/);
});

test('session answers, measures and goals are read back correctly', () => {
  assert.deepEqual(answersFrom({ phq9_0: '1', phq9_1: '2', phq9_8: '0' }, 'phq9'), [1, 2, null, null, null, null, null, null, 0]);
  assert.equal(answersFrom({}, 'gad7'), null);
  assert.deepEqual(answersFrom({ impact_0: 'na', impact_1: '3' }, 'impact'), [null, 3, null, null, null]);
  const s = measureSeries([phq([1, 1, 1, 1, 1, 1, 1, 1, 0], 9), phq([0, 0, 0, 0, 0, 0, 0, 0, 0], 2), gad([1, 1, 1, 1, 1, 1, 1], 1)], 'phq9', ago(10));
  assert.deepEqual(s.map((x) => x.score), [8, 0]);
  const g = goalProgress({ goals: [{ text: 'See a friend weekly', ratings: [{ at: ago(20), v: 2 }, { at: ago(5), v: 6 }] }] });
  assert.equal(g[0].change, 4);
});

test('course records and progress survive a backup round-trip; crafted ones are dropped', () => {
  const input = { app: 'cbt-toolkit', records: [
    { id: 'a', kind: 'course', type: 'session', createdAt: ago(3), data: { course: 'depression', n: '3', takeaway: 'Act first', helpful: '8', safety: '0' }, metrics: { adherence: 0.5 } },
    { id: 'b', kind: 'course', type: 'session', createdAt: ago(2), data: { course: 'made-up', n: 2 } },
    { id: 'c', kind: 'course', type: 'notes', createdAt: ago(2), data: { course: 'depression', n: 2 } },
    { id: 'd', kind: 'course', type: 'session', createdAt: ago(2), data: { course: 'depression', n: 12 } },
  ], kv: [{ key: 'course', value: { id: 'depression', sessions: {} } }, { key: 'course-history', value: [] }, { key: 'evil', value: 1 }] };
  const { data, report } = sanitizeBackup(input);
  assert.equal(report.kept, 1);
  assert.equal(report.dropped, 3);
  assert.equal(data.records[0].data.n, 3);
  assert.equal(data.records[0].data.helpful, 8);
  assert.equal(data.records[0].metrics.helpful, 8);
  assert.deepEqual(data.kv.map((k) => k.key).sort(), ['course', 'course-history']);
  assert.ok(COURSE_BY_ID.depression);
});
