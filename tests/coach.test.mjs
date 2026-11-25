import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyStats, recommend, programProgress, autoCompleteProgram, todaysCheckin, reminderEvents, dayTarget } from '../public/js/lib/coach.js';
import { PROGRAMS, PROGRAM_BY_ID } from '../public/js/data/programs.js';
import { EXERCISE_BY_ID } from '../public/js/data/exercises/index.js';
import { ASSESSMENT_BY_ID } from '../public/js/data/assessments.js';
import { CBT_GUIDE } from '../public/js/data/learn.js';
import { SKILLS, skillForDate } from '../public/js/data/daily.js';
import { buildICS } from '../public/js/lib/ics.js';
import { research } from '../public/js/data/research.js';
import { readFileSync } from 'node:fs';

const NOW = new Date('2026-11-26T09:30:00'); // a Thursday morning
const at = (daysAgo, h = 10) => { const d = new Date(NOW); d.setDate(d.getDate() - daysAgo); d.setHours(h, 0, 0, 0); return d.toISOString(); };
let n = 0;
const rec = (kind, type, daysAgo, data = {}, h = 10) => ({ id: String(n++), kind, type, data, metrics: {}, createdAt: at(daysAgo, h) });

test('streaks count consecutive days and survive "not yet today"', () => {
  const rs = [rec('mood', 'mood', 1), rec('exercise', 'thought-record', 2), rec('exercise', 'thought-record', 3), rec('mood', 'mood', 6)];
  const s = dailyStats(rs, NOW, 5);
  assert.equal(s.streak, 3);
  assert.equal(s.best, 3);
  assert.equal(s.returningAfterGap, false);
  assert.equal(s.today.any, 0);
});

test('weekly practice counts only practice days, Monday to Sunday', () => {
  const rs = [rec('exercise', 'thought-record', 0), rec('mood', 'mood', 1), rec('exercise', 'activity-scheduling', 2), rec('exercise', 'thought-record', 5)];
  const s = dailyStats(rs, NOW, 4);
  assert.equal(s.week.length, 7);
  assert.equal(s.weekPractice, 2); // Thu + Tue (Fri 5 days ago belongs to last week)
  assert.equal(s.week.find((w) => w.isToday).practice, true);
});

test('"never miss twice" nudge after a gap, milestone on streak days', () => {
  const gap = dailyStats([rec('exercise', 'thought-record', 4)], NOW);
  assert.equal(gap.returningAfterGap, true);
  const seven = dailyStats(Array.from({ length: 7 }, (_, i) => rec('exercise', 'thought-record', i)), NOW);
  assert.equal(seven.streak, 7);
  assert.equal(seven.milestone, 7);
});

test('recommendations respond to today’s check-in and give reasons with sources', () => {
  const low = recommend({ records: [rec('mood', 'mood', 0, { mood: 2, anxiety: 8, energy: 2, focus: 'anxiety' }, 8)], now: NOW, limit: 6 });
  const keys = low.map((r) => r.key);
  assert.ok(keys.includes('activity-scheduling'));
  assert.ok(keys.includes('paced-breathing'));
  low.forEach((r) => { assert.ok(r.reason.length > 10); assert.ok(r.href.startsWith('#/')); });
  assert.ok(low.some((r) => r.refs.length));
  const ok = recommend({ records: [rec('mood', 'mood', 0, { mood: 8, anxiety: 2, energy: 8 }, 8), rec('assessment', 'who5', 3)], now: NOW, limit: 6 });
  assert.ok(!ok.map((r) => r.key).includes('paced-breathing') || ok.find((r) => r.key === 'paced-breathing').priority < 50);
});

test('safety comes first when the PHQ-9 self-harm item was endorsed recently', () => {
  const r = recommend({ records: [rec('assessment', 'phq9', 2, { answers: [1, 1, 1, 1, 1, 1, 1, 1, 1] })], now: NOW });
  assert.equal(r[0].kind, 'help');
  assert.equal(r[0].href, '#/help');
});

test('baseline and re-check suggestions follow measurement-based care', () => {
  const fresh = recommend({ records: [], now: NOW, limit: 8 });
  assert.ok(fresh.some((r) => r.checkin === 'who5'));
  const old = recommend({ records: [rec('assessment', 'gad7', 20, { answers: [1, 1, 1, 1, 1, 1, 1] })], now: NOW, limit: 8 });
  assert.ok(old.some((r) => r.checkin === 'gad7'));
});

test('exercises already done today are not suggested again, and plan items behind target are', () => {
  const rs = [rec('exercise', 'activity-scheduling', 0)];
  const r = recommend({ records: rs, now: NOW, plan: { items: [{ ex: 'thought-record', perWeek: 3 }] }, limit: 8 });
  assert.ok(!r.some((x) => x.key === 'activity-scheduling'));
  assert.ok(r.find((x) => x.key === 'thought-record').reason.includes('0 of 3'));
});

test('programme progress, pacing and automatic completion', () => {
  const state = { id: 'mood-lift', start: at(1), done: {} };
  const p0 = programProgress(state, [], NOW);
  assert.equal(p0.index, 0);
  assert.equal(p0.day.checkin, 'phq9');
  // doing the day-1 check-in completes day 1 automatically
  const recs = [rec('assessment', 'phq9', 0, { answers: [0, 0, 0, 0, 0, 0, 0, 0, 0] })];
  const s1 = autoCompleteProgram(state, recs, NOW);
  assert.ok(s1.done[0]);
  // day 2 waits until tomorrow (spaced practice)…
  const p1 = programProgress(s1, recs, NOW);
  assert.equal(p1.index, 1);
  assert.equal(p1.availableToday, false);
  // …unless the user chooses to go on early
  assert.equal(programProgress({ ...s1, early: true }, recs, NOW).availableToday, true);
  const tomorrow = new Date(NOW); tomorrow.setDate(tomorrow.getDate() + 1);
  assert.equal(programProgress(s1, recs, tomorrow).availableToday, true);
  // the programme day is suggested first when available
  assert.equal(recommend({ records: recs, now: tomorrow, programState: s1 })[0].kind, 'program');
  assert.equal(programProgress(null, [], NOW), null);
});

test('programme days only count practice done after they unlock, and catch up across missed visits', () => {
  // foundations: day 1 = guide (manual), day 2 = WHO-5, day 3+ = exercises
  const plan = PROGRAM_BY_ID.foundations.plan;
  const ex3 = plan[2].ex, ex4 = plan[3].ex;
  assert.ok(ex3 && ex4 && plan[1].checkin === 'who5');
  const base = { id: 'foundations', start: at(5), done: { 0: at(5, 11) } };
  // WHO-5 on day 4-ago completes day 2; day-3 exercise done the SAME evening must not count for day 3…
  const sameEvening = [rec('assessment', 'who5', 4, { answers: [3, 3, 3, 3, 3] }, 9), rec('exercise', ex3, 4, {}, 20)];
  const s1 = autoCompleteProgram(base, sameEvening, NOW);
  assert.ok(s1.done[1]);
  assert.equal(s1.done[2], undefined);
  // …but practice on later days catches up several days in one visit, one day per calendar day.
  const later = [...sameEvening, rec('exercise', ex3, 3), rec('exercise', ex4, 3, {}, 21), rec('exercise', ex4, 1)];
  const s2 = autoCompleteProgram(base, later, NOW);
  assert.equal(Object.keys(s2.done).length, 4);
  assert.equal(new Date(s2.done[3]).getDate(), new Date(at(1)).getDate());
  // choosing to go on early lets same-day practice count
  const early = autoCompleteProgram({ ...s1, early: true }, sameEvening, NOW);
  assert.ok(early.done[2]);
  assert.equal(early.early, false);
});

test('every programme day points to a real exercise, check-in or guide section', () => {
  const sections = new Set(CBT_GUIDE.map((g) => g.id));
  assert.equal(PROGRAMS.length, 8);
  assert.equal(PROGRAM_BY_ID.foundations.days, 28);
  for (const p of PROGRAMS) {
    assert.ok(p.plan.length >= 14, p.id);
    for (const [i, d] of p.plan.entries()) {
      const targets = [d.ex, d.checkin, d.learn].filter(Boolean);
      assert.equal(targets.length, 1, `${p.id} day ${i + 1}`);
      if (d.ex) assert.ok(EXERCISE_BY_ID[d.ex], `${p.id} day ${i + 1}: ${d.ex}`);
      if (d.checkin) assert.ok(ASSESSMENT_BY_ID[d.checkin], `${p.id} day ${i + 1}: ${d.checkin}`);
      if (d.learn) assert.ok(sections.has(d.learn), `${p.id} day ${i + 1}: ${d.learn}`);
      assert.ok(d.title && d.lesson && d.task, `${p.id} day ${i + 1} text`);
      assert.ok(dayTarget(d).href.startsWith('#/'));
    }
    if (p.area) { assert.ok(p.plan[0].checkin && p.plan.at(-1).checkin === p.plan[0].checkin, `${p.id} starts and ends with the same check-in`); }
  }
});

test('skill of the day is deterministic and rotates', () => {
  assert.ok(SKILLS.length > 90);
  assert.deepEqual(skillForDate(new Date('2026-11-26T08:00:00')), skillForDate(new Date('2026-11-26T22:00:00')));
  assert.notDeepEqual(skillForDate(new Date('2026-11-26T08:00:00')), skillForDate(new Date('2026-11-27T08:00:00')));
});

test('daily reminders export as recurring calendar events with a link back', () => {
  const ics = buildICS(reminderEvents({ morning: '08:00', evening: '21:30' }, 'https://cbt.example.com/#/today', NOW));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.equal((ics.match(/RRULE:FREQ=DAILY/g) || []).length, 2);
  assert.match(ics, /DTSTART:20261126T080000/);
  assert.match(ics, /DTSTART:20261126T213000/);
  assert.match(ics, /URL:https:\/\/cbt\.example\.com\/#\/today/);
});

test('today’s check-in is the latest mood record from today only', () => {
  const rs = [rec('mood', 'mood', 1, { mood: 1 }), rec('mood', 'mood', 0, { mood: 4 }, 7), rec('mood', 'mood', 0, { mood: 6 }, 9)];
  assert.equal(todaysCheckin(rs, NOW).data.mood, 6);
  assert.equal(todaysCheckin([rec('mood', 'mood', 1)], NOW), null);
});

test('every source cited by programmes, the coach and the daily pages is in the verified library', () => {
  const ids = new Set(research.map((r) => r.id));
  const cited = PROGRAMS.flatMap((p) => p.refs);
  for (const f of ['../public/js/lib/coach.js', '../public/js/views/today.js', '../public/js/views/programs.js']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    for (const m of src.matchAll(/refs:\s*\[([^\]]*)\]/g)) cited.push(...[...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
    for (const m of src.matchAll(/cite\('([^']+)'\)/g)) cited.push(m[1]);
  }
  SKILLS.forEach((s) => s.ref && cited.push(s.ref));
  assert.ok(cited.length > 40);
  assert.deepEqual([...new Set(cited)].filter((id) => !ids.has(id)), []);
});
