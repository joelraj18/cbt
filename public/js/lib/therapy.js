// CBT course engine: session plans, progress, homework, measures, stepped-care recommendations and safety alerts.
// Pure functions over the user's local records (no DOM, no network) — unit-tested in Node.
//
// Clinical rules used here, with their sources:
// - Severity: NICE NG222 calls PHQ-9 ≥ 16 "more severe depression"; GAD-7 ≥ 15 is the severe range (Spitzer et al., 2006).
// - Guided vs self-guided: guided internet CBT beat unguided mainly when PHQ-9 was above 9 (Karyotaki et al., 2021).
// - Reliable change and recovery: NHS Talking Therapies definitions (PHQ-9 change ≥ 6, caseness ≥ 10; GAD-7 ≥ 4, caseness ≥ 8).
// - Not-on-track feedback: acting on deterioration or no change improves outcomes (Lambert et al., 2018; de Jong et al., 2021).
import { COURSE_BY_ID, SESSION_COUNT, SESSION_GAP_DAYS, SESSION_TEMPLATES, SUITABILITY } from '../data/courses.js';
import { ASSESSMENT_BY_ID, scoreAssessment, compareScores } from '../data/assessments.js';
import { EXERCISE_BY_ID } from '../data/exercises/index.js';
import { addDays, startOfDay, daysBetween } from '../core/format.js';

/** The PHQ-9 self-harm item, asked on its own in sessions that don't include the full PHQ-9 (PHQ-9: no permission required). */
export const SAFETY_ITEM = 'Over the last 2 weeks, how often have you been bothered by thoughts that you would be better off dead, or of hurting yourself in some way?';

const pad = (n) => String(n).padStart(2, '0');
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const uniq = (arr) => [...new Set(arr)];
const iso = (d) => (d instanceof Date ? d.toISOString() : String(d));

/** What happens in session n of a course: stage, title, measures and (for sessions 3–7) the skill module. */
export function sessionPlan(courseId, n) {
  const c = COURSE_BY_ID[courseId];
  if (!c || !(n >= 1 && n <= SESSION_COUNT)) return null;
  const tpl = SESSION_TEMPLATES[n];
  const module = tpl ? null : c.modules[n - 3];
  // Measures: the course's main measure every week; PHQ-9, GAD-7 and life impact at the start, middle and end.
  const checkpoint = n === 1 || n === 4 || n === SESSION_COUNT;
  const wanted = new Set([c.primary, ...(checkpoint ? [...c.checkpoints, 'impact'] : []), ...(n === 1 ? ['phq9', 'gad7'] : [])]);
  const measures = ['phq9', 'gad7', c.primary, 'impact'].filter((id, i, arr) => wanted.has(id) && arr.indexOf(id) === i && ASSESSMENT_BY_ID[id]);
  return {
    n, course: c.id, stage: tpl ? tpl.stage : 'module', module,
    title: tpl ? tpl.title : module.title,
    minutes: tpl ? tpl.minutes : 25,
    aim: tpl ? tpl.aim : module.learn.split(/(?<=[.!?])\s+/)[0],
    measures, safetyQuestion: !measures.includes('phq9'),
    refs: tpl ? tpl.refs : module.refs,
  };
}

/** Practice set at the last session, and how much of it has been done since. */
export function homeworkStatus(items = [], records = [], since = null) {
  const s = since ? iso(since) : null;
  const list = (items || []).filter((h) => h && EXERCISE_BY_ID[h.ex]).map((h) => {
    const perWeek = Math.max(1, Math.min(14, Math.round(Number(h.perWeek) || 1)));
    const done = s ? records.filter((r) => r.kind === 'exercise' && r.type === h.ex && r.createdAt >= s).length : 0;
    return { ex: h.ex, perWeek, done, complete: done >= perWeek };
  });
  const target = list.reduce((a, h) => a + h.perWeek, 0);
  const got = list.reduce((a, h) => a + Math.min(h.done, h.perWeek), 0);
  return { items: list, done: got, target, adherence: target ? got / target : null };
}

/** Where the user is in their course. */
export function courseProgress(state, records = [], now = new Date()) {
  const c = state && COURSE_BY_ID[state.id];
  if (!c) return null;
  const sessions = state.sessions || {};
  const done = Object.keys(sessions).map(Number).filter((n) => sessions[n] && n >= 1 && n <= SESSION_COUNT).sort((a, b) => a - b);
  let next = 1;
  while (next <= SESSION_COUNT && sessions[next]) next++;
  const finished = next > SESSION_COUNT;
  const lastAt = done.length ? new Date(sessions[done.at(-1)].at) : null;
  const dueAt = lastAt ? addDays(startOfDay(lastAt), SESSION_GAP_DAYS) : startOfDay(state.start || now);
  const due = !finished && (next === 1 || now >= dueAt || !!state.early);
  const homework = homeworkStatus(state.homework, records, lastAt);
  return {
    course: c, next: finished ? null : next, finished, done, completed: done.length,
    percent: Math.round((done.length / SESSION_COUNT) * 100), lastAt, dueAt, due,
    daysUntilDue: due ? 0 : Math.max(1, daysBetween(now, dueAt)),
    plan: finished ? null : sessionPlan(c.id, next), homework,
  };
}

/** Scored series of one questionnaire (oldest first), optionally since a date. */
export function measureSeries(records = [], id, since = null) {
  const a = ASSESSMENT_BY_ID[id];
  if (!a) return [];
  const s = since ? iso(since) : null;
  return records.filter((r) => r.kind === 'assessment' && r.type === id && (!s || r.createdAt >= s))
    .sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1))
    .map((r) => { const answers = r.data?.answers || []; return { at: r.createdAt, score: scoreAssessment(a, answers).score, answers, id: r.id }; });
}

/** Outcome between a first and latest score, using NHS Talking Therapies definitions where a caseness cut-off exists. */
export function outcome(id, first, last) {
  const a = ASSESSMENT_BY_ID[id];
  if (!a || first == null || last == null) return null;
  const c = compareScores(a, first, last);
  const caseAtStart = a.caseness != null ? first >= a.caseness : null;
  const caseNow = a.caseness != null ? last >= a.caseness : null;
  let status, label, tone;
  if (c.reliable && !c.better) { status = 'deteriorated'; label = 'Reliable deterioration'; tone = 'crisis'; }
  else if (c.reliable && c.better && caseAtStart && !caseNow) { status = 'recovered'; label = 'Reliable recovery'; tone = 'good'; }
  else if (c.reliable && c.better) { status = 'improved'; label = 'Reliable improvement'; tone = 'good'; }
  else { status = 'no-reliable-change'; label = c.diff === 0 ? 'No change' : c.better ? 'Small improvement (within normal ups and downs)' : 'Small worsening (within normal ups and downs)'; tone = 'info'; }
  return { status, label, tone, diff: c.diff, first, last, reliableChange: a.reliableChange, caseness: a.caseness ?? null, caseAtStart, caseNow, validated: a.validated };
}

const LEVELS = {
  urgent: { title: 'Please talk to someone today', tone: 'crisis',
    text: 'You told us about thoughts of harming yourself or being better off dead, or about something that needs urgent support. Please contact a crisis line, your doctor or emergency services today — Get help now lists numbers for many countries. You can still use this course alongside professional help, but your safety comes first.',
    refs: ['stanley2018'] },
  professional: { title: 'We recommend seeing a professional, with this course alongside', tone: 'warn',
    text: 'Your answers suggest more severe difficulties, or something that needs a specialist assessment. NICE recommends individual CBT or behavioural activation with a therapist — and sometimes medication — for more severe depression, and high-intensity CBT for severe anxiety. Please talk to your doctor or a psychologist. You can use this course alongside, and the clinician summary makes it easy to share your progress.',
    refs: ['nice-ng222', 'nice-cg113'] },
  guided: { title: 'Self-help works best here with some support', tone: 'info',
    text: 'Guided self-help — CBT materials plus a supporter who reviews your progress — is the recommended first step at this level. Self-help works better with support, and in a large analysis internet CBT with human support beat self-guided CBT for people whose PHQ-9 was above 9. If you can, ask your doctor or a therapist to look at your weekly summary, or share your progress with someone you trust.',
    refs: ['nice-ng222', 'karyotaki2021', 'gellatly2007'] },
  self: { title: 'Self-guided CBT is a good fit', tone: 'good',
    text: 'Your answers suggest mild or no symptoms of depression and anxiety. At this level, self-guided internet CBT worked about as well as guided CBT in a large analysis — and practising these skills now can stop problems from growing.',
    refs: ['karyotaki2021'] },
};

/**
 * Recommended level of support (NICE stepped care).
 * input: { phq9: answers[], gad7: answers[], impact: answers[], suitability: ids[], safety: 0–3 }
 */
export function triage({ phq9 = null, gad7 = null, impact = null, suitability = [], safety = null } = {}) {
  const score = (id, ans) => (ans && ans.some((v) => v != null) ? scoreAssessment(ASSESSMENT_BY_ID[id], ans).score : null);
  const p = score('phq9', phq9), g = score('gad7', gad7), im = score('impact', impact);
  const selfHarm = (phq9 && Number(phq9[8]) > 0) || Number(safety) > 0;
  const flags = SUITABILITY.filter((s) => (suitability || []).includes(s.id));
  const reasons = [];
  if (selfHarm) reasons.push('You reported thoughts of being better off dead or of hurting yourself.');
  flags.forEach((f) => reasons.push(`You said: “${f.label}”.`));
  if (p != null) reasons.push(`PHQ-9 ${p} of 27 — ${p >= 16 ? 'NICE counts 16 or more as more severe depression' : p >= 10 ? 'above the clinical cut-off of 10' : 'below the clinical cut-off of 10'}.`);
  if (g != null) reasons.push(`GAD-7 ${g} of 21 — ${g >= 15 ? 'in the severe range (15 or more)' : g >= 10 ? 'in the moderate range' : g >= 8 ? 'just above the clinical cut-off of 8' : 'below the clinical cut-off of 8'}.`);
  if (im != null) reasons.push(`Life impact ${im}% (an original, unvalidated check).`);
  let level;
  if (selfHarm || flags.some((f) => f.urgent)) level = 'urgent';
  else if ((p != null && p >= 16) || (g != null && g >= 15) || flags.length || (im != null && im >= 75)) level = 'professional';
  else if ((p != null && p >= 10) || (g != null && g >= 10) || (im != null && im >= 50)) level = 'guided';
  else level = 'self';
  return { level, phq9: p, gad7: g, impact: im, selfHarm, flags: flags.map((f) => f.id), reasons, ...LEVELS[level] };
}

/** All saved sessions of a course, oldest first. */
export function courseRecords(records = [], courseId = null) {
  return records.filter((r) => r.kind === 'course' && r.type === 'session' && (!courseId || r.data?.course === courseId))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/** The saved record for session n (latest if repeated). */
export function sessionRecord(records, state, n) {
  const sid = state?.sessions?.[n]?.rec;
  const all = courseRecords(records, state?.id);
  return all.find((r) => r.id === sid) || all.filter((r) => Number(r.data?.n) === Number(n)).at(-1) || null;
}

/**
 * Safety and "not on track" alerts while a course is running, most important first.
 * Each: { id, tone, title, text, refs }
 */
export function courseAlerts(state, records = [], now = new Date()) {
  const c = state && COURSE_BY_ID[state.id];
  if (!c) return [];
  const since = state.start || null;
  const alerts = [];
  const recent = (at) => daysBetween(at, now) <= 14;
  const phq = measureSeries(records, 'phq9', since).at(-1);
  const safety = courseRecords(records, c.id).filter((r) => r.data?.safety != null && r.data.safety !== '').at(-1);
  if ((phq && recent(phq.at) && Number(phq.answers[8]) > 0) || (safety && recent(safety.createdAt) && Number(safety.data.safety) > 0)) {
    alerts.push({ id: 'risk', tone: 'crisis', title: 'Your safety comes first',
      text: 'In a recent check-in you mentioned thoughts of being better off dead or of hurting yourself. Please talk to someone today — a crisis line, your doctor or someone you trust — and use your safety plan.', refs: ['stanley2018'] });
  }
  // NICE: PHQ-9 ≥ 16 is "more severe" depression; GAD-7 ≥ 15 is the severe range.
  const severe = [['phq9', 16], ['gad7', 15]].map(([id, cut]) => ({ id, last: measureSeries(records, id, since).at(-1), cut })).filter((x) => x.last && recent(x.last.at) && x.last.score >= x.cut);
  if (severe.length) {
    alerts.push({ id: 'severe', tone: 'warn', title: 'Please add professional support',
      text: `Your latest ${severe.map((x) => `${ASSESSMENT_BY_ID[x.id].name} (${x.last.score})`).join(' and ')} ${severe.length > 1 ? 'are' : 'is'} at a level where guidelines recommend treatment with a professional (PHQ-9 16 or more; GAD-7 15 or more). Please talk to your doctor or a psychologist. You can keep using the course alongside.`,
      refs: ['nice-ng222', 'nice-cg113'] });
  }
  const series = measureSeries(records, c.primary, since);
  const a = ASSESSMENT_BY_ID[c.primary];
  if (series.length >= 2) {
    const o = outcome(c.primary, series[0].score, series.at(-1).score);
    if (o.status === 'deteriorated') {
      alerts.push({ id: 'deterioration', tone: 'warn', title: `${a.name} has got reliably worse`,
        text: `Your ${a.name} score has risen from ${series[0].score} to ${series.at(-1).score}${a.percent ? '%' : ''} since you started — more than normal ups and downs. Please review this with a doctor or psychologist. In therapy research, acting early when someone is not on track improves outcomes.`,
        refs: ['lambert2018', 'dejong2021'] });
    }
    const sessionsDone = Object.keys(state.sessions || {}).length;
    const clinicalStart = a.caseness != null ? series[0].score >= a.caseness : series[0].score >= 50;
    if (o.status === 'no-reliable-change' && sessionsDone >= 5 && clinicalStart && series.length >= 4) {
      alerts.push({ id: 'not-improving', tone: 'info', title: 'Time to review the plan',
        text: `After ${sessionsDone} sessions your ${a.name} hasn’t changed reliably. That is common and doesn’t mean CBT can’t help you — but it is the point at which therapists review the plan. Consider talking to a doctor or psychologist about stepping up to therapy, revisit your CBT map, and focus on the practice you find hardest.`,
        refs: ['nice-ng222', 'lambert2018', 'dejong2021'] });
    }
  }
  return alerts;
}

/** Goal ratings over time: [{ text, how, first, last, change, ratings }] */
export function goalProgress(state) {
  return (state?.goals || []).map((g) => {
    const r = (g.ratings || []).filter((x) => x && x.v != null);
    return { text: g.text, how: g.how || '', ratings: r, first: r[0]?.v ?? null, last: r.at(-1)?.v ?? null, change: r.length > 1 ? r.at(-1).v - r[0].v : null };
  });
}

/** Weekly calendar reminders for the remaining sessions, on the chosen weekday and time. */
export function sessionReminderEvents(state, url = '', now = new Date()) {
  const c = state && COURSE_BY_ID[state.id];
  if (!c) return [];
  const prog = courseProgress(state, [], now);
  if (prog.finished) return [];
  const remaining = SESSION_COUNT - prog.completed;
  const day = Number.isInteger(Number(state.sessionDay)) ? Number(state.sessionDay) : 6;
  const [h, mi] = String(state.sessionTime || '18:00').split(':').map(Number);
  let d = prog.due ? addDays(startOfDay(now), 1) : startOfDay(prog.dueAt);
  for (let i = 0; i < 7 && d.getDay() !== day; i++) d = addDays(d, 1);
  d.setHours(Number.isFinite(h) ? h : 18, Number.isFinite(mi) ? mi : 0, 0, 0);
  return [{ title: `CBT course session — ${c.name}`, start: localISO(d), minutes: 30, url,
    description: 'Your weekly self-guided CBT session: check in, review your practice, learn one skill and plan the week ahead.',
    rrule: `FREQ=WEEKLY;COUNT=${remaining}` }];
}

/** Check-ups with yourself 1, 3 and 6 months after finishing (booster sessions). */
export function boosterEvents(now = new Date(), url = '') {
  return [1, 3, 6].map((months) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    d.setHours(18, 0, 0, 0);
    return { title: `CBT check-up — ${months} month${months > 1 ? 's' : ''} after your course`, start: localISO(d), minutes: 20, url,
      description: 'Re-take your check-ins, read your staying-well plan, and practise your most helpful skill once.' };
  });
}

/** Which exercises were practised during the course, most used first. */
export function practisedDuring(records = [], since = null) {
  const s = since ? iso(since) : null;
  const counts = new Map();
  for (const r of records) if (r.kind === 'exercise' && EXERCISE_BY_ID[r.type] && (!s || r.createdAt >= s)) counts.set(r.type, (counts.get(r.type) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([ex, n]) => ({ ex, n }));
}

/** Answers for one questionnaire from a session form's flat data (keys like "phq9_0"). */
export function answersFrom(data, id) {
  const a = ASSESSMENT_BY_ID[id];
  if (!a) return null;
  const ans = a.items.map((_, i) => { const v = data?.[`${id}_${i}`]; return v == null || v === '' || v === 'na' ? null : Number(v); });
  return ans.some((v) => v != null) ? ans : null;
}

export const uniqIds = uniq;
