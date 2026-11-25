// Daily coach: streaks, weekly goal, programme progress and personalised "today" suggestions.
// Pure functions over the user's local records (no DOM, no network) — unit-tested in Node.
// Every suggestion carries a plain-language reason and the research it is based on.
import { EXERCISE_BY_ID } from '../data/exercises/index.js';
import { ASSESSMENT_BY_ID } from '../data/assessments.js';
import { AREA_BY_ID } from '../data/areas.js';
import { PROGRAM_BY_ID } from '../data/programs.js';
import { dayKey, startOfDay, addDays, startOfWeek, daysBetween } from '../core/format.js';
import { courseProgress, courseAlerts } from './therapy.js';

export const PRACTICE_KINDS = new Set(['exercise', 'session', 'daily', 'assessment', 'course']);
export const MILESTONES = [3, 7, 14, 21, 30, 50, 66, 100, 150, 200, 365];
export const DEFAULT_SETTINGS = { morning: '08:00', evening: '21:00', weeklyGoal: 5 };

const sameDay = (iso, now) => dayKey(iso) === dayKey(now);
const latest = (records, pred) => records.filter(pred).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] || null;

/** Show-up streak, best streak, this week's practice days and today's status. */
export function dailyStats(records, now = new Date(), weeklyGoal = DEFAULT_SETTINGS.weeklyGoal) {
  const byDay = new Map();
  for (const r of records) {
    const k = dayKey(r.createdAt);
    const e = byDay.get(k) || { any: 0, practice: 0 };
    e.any++;
    if (PRACTICE_KINDS.has(r.kind)) e.practice++;
    byDay.set(k, e);
  }
  const todayKey = dayKey(now);
  let streak = 0;
  let d = byDay.has(todayKey) ? startOfDay(now) : addDays(startOfDay(now), -1);
  while (byDay.has(dayKey(d))) { streak++; d = addDays(d, -1); }
  let best = 0, run = 0, prev = null;
  for (const k of [...byDay.keys()].sort()) {
    const cur = new Date(k + 'T12:00:00');
    run = prev && Math.round((cur - prev) / 864e5) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = cur;
  }
  const ws = startOfWeek(now);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(ws, i); const k = dayKey(day); const e = byDay.get(k);
    return { key: k, date: day, any: !!e, practice: !!(e && e.practice), isToday: k === todayKey, future: day > now && k !== todayKey };
  });
  const keys = [...byDay.keys()].sort();
  const last = keys.filter((k) => k < todayKey).at(-1) || null;
  const gapDays = last ? daysBetween(new Date(last + 'T12:00:00'), now) : null;
  return {
    streak, best, totalDays: byDay.size, week, weeklyGoal,
    weekPractice: week.filter((w) => w.practice).length,
    today: byDay.get(todayKey) || { any: 0, practice: 0 },
    // "Never miss twice": they have history, did nothing yesterday, and nothing yet today.
    returningAfterGap: !byDay.has(todayKey) && gapDays != null && gapDays >= 2,
    gapDays,
    milestone: MILESTONES.includes(streak) && byDay.has(todayKey) ? streak : null,
  };
}

export const todaysCheckin = (records, now = new Date()) => latest(records, (r) => r.kind === 'mood' && sameDay(r.createdAt, now));
export const todaysReflection = (records, now = new Date()) => latest(records, (r) => r.kind === 'daily' && r.type === 'reflection' && sameDay(r.createdAt, now));
export const typesDoneToday = (records, now = new Date()) => new Set(records.filter((r) => (r.kind === 'exercise' || r.kind === 'assessment') && sameDay(r.createdAt, now)).map((r) => r.type));

/** Where the user is in a programme; detects when today's task has been done. */
export function programProgress(state, records, now = new Date()) {
  const p = state && PROGRAM_BY_ID[state.id];
  if (!p) return null;
  const done = state.done || {};
  let i = 0;
  while (i < p.plan.length && done[i]) i++;
  const completed = Object.keys(done).length;
  if (i >= p.plan.length) return { program: p, index: i, day: null, finished: true, completed, percent: 100, availableToday: false, autoDone: null };
  const day = p.plan[i];
  const since = i === 0 ? state.start : done[i - 1];
  // Pacing: one programme day per calendar day keeps practice spaced out (you can choose to go on early).
  const availableToday = i === 0 || !done[i - 1] || dayKey(done[i - 1]) < dayKey(now) || !!state.early;
  let autoDone = null;
  if (since && (day.ex || day.checkin)) {
    // Only practice done once this day was unlocked counts: after the previous day, on a later calendar
    // day (or any time after choosing to go on early). Otherwise one busy evening could tick off several days.
    const counts = (r) => r.createdAt >= since && (i === 0 || !!state.early || dayKey(r.createdAt) > dayKey(since));
    const match = records
      .filter((r) => (day.ex && r.kind === 'exercise' && r.type === day.ex) || (day.checkin && r.kind === 'assessment' && r.type === day.checkin))
      .filter(counts)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))[0];
    if (match) autoDone = match.createdAt;
  }
  return { program: p, index: i, day, finished: false, completed, percent: Math.round((completed / p.plan.length) * 100), availableToday, autoDone };
}

/** Returns a new state if the current day's task was detected as done, otherwise null. */
export function autoCompleteProgram(state, records, now = new Date()) {
  let cur = state, changed = false;
  // Catch up every day already earned (e.g. practised on days you didn't open Today), one day at a time.
  for (let guard = 0; guard < 400; guard++) {
    const pr = programProgress(cur, records, now);
    if (!pr || pr.finished || !pr.autoDone || !pr.availableToday) break;
    const done = { ...(cur.done || {}), [pr.index]: pr.autoDone };
    const finished = Object.keys(done).length >= pr.program.plan.length;
    cur = { ...cur, done, early: false, finishedAt: finished ? pr.autoDone : cur.finishedAt || null };
    changed = true;
  }
  return changed ? cur : null;
}

export function dayTarget(day) {
  if (day.ex) { const e = EXERCISE_BY_ID[day.ex]; return { href: `#/exercise/${day.ex}?tab=do&from=today`, minutes: day.minutes || e?.minutes || 10, label: e?.title || day.ex }; }
  if (day.checkin) { const a = ASSESSMENT_BY_ID[day.checkin]; return { href: `#/check-in/${day.checkin}`, minutes: a?.minutes || 2, label: a?.title || day.checkin }; }
  return { href: `#/learn?s=${day.learn}`, minutes: 5, label: 'Read the guide' };
}

/**
 * Personalised suggestions for today, highest priority first.
 * input: { records, now, plan, programState, limit }
 */
export function recommend({ records = [], now = new Date(), plan = null, programState = null, courseState = null, limit = 4 } = {}) {
  const cands = [];
  const done = typesDoneToday(records, now);
  const add = (c) => {
    if (c.ex && !EXERCISE_BY_ID[c.ex]) return;
    if (c.ex && done.has(c.ex) && c.kind !== 'program') return;
    const e = c.ex ? EXERCISE_BY_ID[c.ex] : null;
    cands.push({
      kind: 'exercise', refs: [], ...c,
      key: c.key || c.ex || c.checkin || c.href,
      title: c.title || e?.title,
      minutes: c.minutes ?? e?.minutes ?? 5,
      level: e?.level || null,
      area: e?.area || (c.checkin ? ASSESSMENT_BY_ID[c.checkin]?.area : null),
      href: c.href || (c.ex ? `#/exercise/${c.ex}?tab=do&from=today` : c.checkin ? `#/check-in/${c.checkin}` : '#/today'),
    });
  };

  // 0. Safety first: a recent PHQ-9 that mentioned thoughts of self-harm.
  const phq = latest(records, (r) => r.kind === 'assessment' && r.type === 'phq9');
  if (phq && daysBetween(phq.createdAt, now) <= 14 && Number(phq.data?.answers?.[8]) > 0) {
    add({ kind: 'help', key: 'help', title: 'Talk to someone today', href: '#/help', minutes: 5, priority: 100, reason: 'Your recent depression check-in mentioned thoughts of self-harm or being better off dead. Reaching out — and making a safety plan — matters more than any exercise.', refs: ['stanley2018'] });
  }

  // 0b. CBT course: safety and "not on track" alerts, the weekly session when it is due, and the practice set in the last session.
  const cp = courseProgress(courseState, records, now);
  if (cp) {
    for (const al of courseAlerts(courseState, records, now)) {
      if (al.id === 'risk') add({ kind: 'help', key: 'help', title: 'Talk to someone today', href: '#/help', minutes: 5, priority: 100, reason: al.text, refs: al.refs });
      else add({ kind: 'review', key: 'course-review', title: al.title, href: '#/course', minutes: 5, priority: 95, reason: al.text, refs: al.refs });
    }
    if (!cp.finished && cp.due) {
      add({ kind: 'course', key: 'course', title: `CBT course — session ${cp.next}: ${cp.plan.title}`, href: '#/course/session', minutes: cp.plan.minutes, priority: 92,
        reason: cp.next === 1 ? 'Start your CBT course with a 25-minute assessment: your problem in your words, standard questionnaires and the right level of support.' : 'Your weekly CBT session is ready. Guided self-help usually runs to about 8 regular weekly sessions.',
        refs: ['nice-ng222'] });
    }
    if (!cp.finished) {
      for (const h of cp.homework.items) {
        if (!h.complete) add({ ex: h.ex, priority: 62 + Math.min(10, (h.perWeek - h.done) * 2), reason: `Practice from your CBT course: ${h.done} of ${h.perWeek} done since your last session. Practice between sessions is where change happens.`, refs: ['kazantzis2010'] });
      }
    }
  }

  // 1. Today's programme day.
  const pr = programProgress(programState, records, now);
  if (pr && !pr.finished && pr.availableToday && !pr.autoDone) {
    const t = dayTarget(pr.day);
    add({ kind: 'program', key: 'program', ex: pr.day.ex, checkin: pr.day.checkin, title: `Day ${pr.index + 1}: ${pr.day.title}`, href: t.href, minutes: t.minutes, priority: 90, reason: `${pr.program.name} programme — ${pr.day.lesson}`, refs: pr.program.refs.slice(0, 1) });
  }

  // 2. How you are today (from the morning check-in).
  const ci = todaysCheckin(records, now);
  const m = ci?.data || {};
  if (m.mood != null && m.mood <= 3) {
    add({ ex: 'activity-scheduling', priority: 86, reason: `Your mood is ${m.mood}/10 today. Planning one small, doable activity is the best-supported first step when mood is low.`, refs: ['ekers2014'] });
    add({ ex: 'self-compassion-break', priority: 63, reason: 'Low days often bring harsh self-talk. A kinder response reduces it — and makes it easier to try again.', refs: ['ferrari2019'] });
  }
  if (m.anxiety != null && m.anxiety >= 7) {
    add({ ex: 'paced-breathing', priority: 85, reason: `Anxiety is ${m.anxiety}/10. A few minutes of slow breathing settles the body first.`, refs: ['balban2023'] });
    add({ ex: 'worry-tree', priority: 72, reason: 'Then sort the worry: act on it if you can, let it go if you can’t.', refs: ['dugas1998'] });
  }
  if (m.energy != null && m.energy <= 3) add({ ex: 'move-for-mood', priority: 67, reason: `Energy is ${m.energy}/10. A gentle 10-minute walk usually lifts both energy and mood.`, refs: ['noetel2024'] });
  if (m.focus && AREA_BY_ID[m.focus]) {
    const a = AREA_BY_ID[m.focus];
    const next = [...a.startHere, ...a.order].find((id) => !done.has(id));
    if (next) add({ ex: next, priority: 80, reason: `You chose ${a.name.toLowerCase()} as today’s focus — this is its best-evidenced next step.`, refs: EXERCISE_BY_ID[next].refs.slice(0, 1) });
  }

  // 3. Your plan: items behind this week's target.
  if (plan?.items?.length) {
    const ws = startOfWeek(now).toISOString();
    for (const it of plan.items) {
      const per = Math.max(1, Math.min(7, Number(it.perWeek) || 1));
      const doneW = records.filter((r) => r.type === it.ex && r.createdAt >= ws).length;
      if (doneW < per) add({ ex: it.ex, priority: 58 + Math.min(12, (per - doneW) * 3), reason: `On your plan: ${doneW} of ${per} this week.`, refs: ['mausbach2010'] });
    }
  }

  // 4. Measurement: a baseline, then a re-check every two weeks.
  const anyCheck = records.some((r) => r.kind === 'assessment');
  if (!anyCheck) add({ kind: 'checkin', checkin: 'who5', title: ASSESSMENT_BY_ID.who5.title, minutes: 1, priority: 57, reason: 'Get a baseline. A 1-minute wellbeing check lets you see real change later.', refs: ['lambert2018'] });
  for (const id of ['phq9', 'gad7']) {
    const last = latest(records, (r) => r.kind === 'assessment' && r.type === id);
    const age = last ? daysBetween(last.createdAt, now) : null;
    if (last && age >= 14) add({ kind: 'checkin', checkin: id, title: ASSESSMENT_BY_ID[id].title, minutes: 2, priority: 56, reason: `It’s been ${age} days since your last ${ASSESSMENT_BY_ID[id].name}. Re-checking every two weeks shows what is working.`, refs: ['lambert2018'] });
  }

  // 5. Time of day and day of week.
  const h = now.getHours(), dow = now.getDay();
  if (h >= 5 && h < 12) add({ ex: 'if-then-plans', priority: 47, reason: 'Morning is a good moment to decide exactly when and where you’ll act today.', refs: ['gollwitzer2006'] });
  if (h >= 18 || h < 2) {
    add({ ex: 'brain-dump', priority: 46, reason: 'Writing a specific to-do list for 5 minutes at bedtime helped people fall asleep faster.', refs: ['scullin2018'] });
    add({ ex: 'three-good-things', priority: 44, reason: 'End the day by noticing what went right.', refs: ['seligman2005'] });
  }
  if (dow === 1) add({ ex: 'weekly-plan', priority: 54, reason: 'A new week is a natural fresh start — a good moment to plan.', refs: ['dai2014'] });
  if (dow === 5 || dow === 0) add({ ex: 'weekly-review', priority: 52, reason: 'End of the week: 15 minutes to learn from it and set up the next.', refs: ['harkin2016'] });

  // 6. Keep skills fresh: favourite exercises not used for a week.
  const lastByType = new Map();
  for (const r of records) if (r.kind === 'exercise' && (!lastByType.has(r.type) || lastByType.get(r.type) < r.createdAt)) lastByType.set(r.type, r.createdAt);
  [...lastByType.entries()].filter(([, at]) => daysBetween(at, now) >= 7).sort((a, b) => (a[1] < b[1] ? 1 : -1)).slice(0, 2)
    .forEach(([type, at]) => add({ ex: type, priority: 40, reason: `You last practised this ${daysBetween(at, now)} days ago. Regular practice keeps skills ready for hard moments.`, refs: ['kazantzis2010'] }));

  // 7. Good defaults for anyone.
  add({ ex: 'activity-scheduling', priority: 30, reason: 'A great daily default: plan one small thing that matters to you.', refs: ['cuijpers2007ba'] });
  add({ ex: 'thought-record', priority: 29, reason: 'When a strong feeling shows up today, catch and check the thought behind it.', refs: ['cuijpers2023'] });
  add({ ex: 'paced-breathing', priority: 28, reason: 'Five minutes of slow breathing is an easy daily reset.', refs: ['zaccaro2018'] });

  // dedupe (keep highest priority), sort, limit
  const best = new Map();
  for (const c of cands) if (!best.has(c.key) || best.get(c.key).priority < c.priority) best.set(c.key, c);
  return [...best.values()].sort((a, b) => b.priority - a.priority).slice(0, limit);
}

/** Calendar events for daily reminders (morning check-in, evening reflection). */
export function reminderEvents({ morning, evening } = DEFAULT_SETTINGS, url = '', now = new Date()) {
  const today = dayKey(now);
  const ev = [];
  if (morning) ev.push({ title: 'CBT check-in (2 minutes)', start: `${today}T${morning}`, minutes: 5, rrule: 'FREQ=DAILY', url, description: `How are you today? Check in and see today’s practice: ${url}` });
  if (evening) ev.push({ title: 'CBT evening reflection (3 minutes)', start: `${today}T${evening}`, minutes: 5, rrule: 'FREQ=DAILY', url, description: `Note a win, what you learned and one step for tomorrow: ${url}` });
  return ev;
}
