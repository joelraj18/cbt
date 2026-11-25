// Report engine: turns raw local records into a structured progress report.
// Pure functions (no DOM) so they can be unit-tested in Node.
import { ASSESSMENTS, scoreAssessment, compareScores } from '../data/assessments.js';
import { AREAS } from '../data/areas.js';
import { EXERCISE_BY_ID } from '../data/exercises/index.js';
import { mean, median, streaks, dailyMeans, slopePerDay, round } from './stats.js';
import { dayKey } from '../core/format.js';

const n = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const avgOf = (recs, key) => mean(recs.map((r) => n(r.metrics?.[key])).filter((v) => v != null));

export function filterPeriod(records, { days = null, now = new Date() } = {}) {
  if (!days) return records.slice();
  const since = new Date(now.getTime() - days * 864e5).toISOString();
  return records.filter((r) => r.createdAt >= since);
}

export function overview(recs, now = new Date()) {
  const ex = recs.filter((r) => r.kind === 'exercise' || r.kind === 'session');
  const byArea = Object.fromEntries(AREAS.map((a) => [a.id, 0]));
  ex.forEach((r) => { const a = EXERCISE_BY_ID[r.type]?.area || r.area; if (a in byArea) byArea[a]++; });
  const byType = {};
  ex.forEach((r) => { byType[r.type] = (byType[r.type] || 0) + 1; });
  const st = streaks(recs.map((r) => r.createdAt), now);
  return {
    entries: recs.length, exercises: ex.length,
    checkins: recs.filter((r) => r.kind === 'assessment').length,
    moods: recs.filter((r) => r.kind === 'mood').length,
    reflections: recs.filter((r) => r.kind === 'daily').length,
    checkinDays: new Set(recs.filter((r) => r.kind === 'mood').map((r) => dayKey(r.createdAt))).size,
    activeDays: st.activeDays, streak: st.current, longestStreak: st.longest,
    byArea, topExercises: Object.entries(byType).map(([id, count]) => ({ id, count, title: EXERCISE_BY_ID[id]?.title || id })).sort((a, b) => b.count - a.count).slice(0, 6),
    perDay: recs.reduce((m, r) => { const k = dayKey(r.createdAt); m[k] = (m[k] || 0) + 1; return m; }, {}),
  };
}

export function assessmentTrends(allRecords, periodRecords) {
  return ASSESSMENTS.map((a) => {
    const recs = periodRecords.filter((r) => r.kind === 'assessment' && r.type === a.id).sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1));
    if (!recs.length) return null;
    const points = recs.map((r) => ({ x: r.createdAt, y: scoreAssessment(a, r.data.answers).score }));
    const first = points[0], last = points.at(-1);
    const lastScored = scoreAssessment(a, recs.at(-1).data.answers);
    return { id: a.id, name: a.name, title: a.title, area: a.area, validated: a.validated, points, first: first.y, last: last.y, band: lastScored.band, flags: lastScored.flags,
      change: points.length > 1 ? compareScores(a, first.y, last.y) : null, count: points.length, max: a.max, percent: !!a.percent, higherIsWorse: a.higherIsWorse, reliableChange: a.reliableChange, chartBands: a.chartBands };
  }).filter(Boolean);
}

export function moodSummary(periodRecords, allRecords, days) {
  const moods = periodRecords.filter((r) => r.kind === 'mood' && n(r.data.mood) != null);
  if (!moods.length) return null;
  const pts = moods.map((r) => ({ x: r.createdAt, y: r.data.mood }));
  const daily = dailyMeans(pts);
  let prevAvg = null;
  if (days) {
    const now = Date.now();
    const prev = allRecords.filter((r) => r.kind === 'mood' && n(r.data.mood) != null && now - new Date(r.createdAt) >= days * 864e5 && now - new Date(r.createdAt) < 2 * days * 864e5);
    prevAvg = mean(prev.map((r) => r.data.mood));
  }
  const slope = slopePerDay(daily);
  return {
    count: moods.length, avg: round(mean(moods.map((r) => r.data.mood)), 1), prevAvg: round(prevAvg, 1),
    anxietyAvg: round(mean(moods.map((r) => n(r.data.anxiety)).filter((v) => v != null)), 1),
    trendPerWeek: slope == null ? null : round(slope * 7, 2),
    daily, anxietyDaily: dailyMeans(moods.filter((r) => n(r.data.anxiety) != null).map((r) => ({ x: r.createdAt, y: r.data.anxiety }))),
  };
}

/** Exercise-specific findings: each returns { id, title, text, value, refs } or null. */
export function exerciseFindings(recs) {
  const of = (type) => recs.filter((r) => r.type === type);
  const F = [];
  const add = (type, text, refs, extra = {}) => F.push({ type, title: EXERCISE_BY_ID[type]?.title || type, text, refs, ...extra });

  const tr = of('thought-record').filter((r) => n(r.metrics?.before) != null && n(r.metrics?.after) != null);
  if (tr.length) { const drop = mean(tr.map((r) => r.metrics.before - r.metrics.after)); add('thought-record', `Across ${tr.length} thought record${tr.length > 1 ? 's' : ''}, the intensity of your strongest feeling dropped by an average of ${round(drop, 0)} points (out of 100) after you weighed the evidence.`, ['cuijpers2023', 'webb2012'], { value: round(drop, 0), good: drop > 0 }); }

  const as = of('activity-scheduling').filter((r) => n(r.metrics?.surprise) != null);
  if (as.length) { const s = mean(as.map((r) => r.metrics.surprise)); add('activity-scheduling', `You enjoyed planned activities ${s > 0 ? `${round(s, 1)} points more` : `${round(Math.abs(s), 1)} points less`} than you predicted (${as.length} activities). ${s > 0 ? 'Low mood tends to underestimate how good things will feel — keep scheduling.' : 'Try mixing in different kinds of activities.'}`, ['ekers2014', 'cuijpers2007ba'], { value: round(s, 1), good: s >= 0 }); }

  const am = of('activity-monitoring').filter((r) => r.data.category && n(r.data.mood) != null);
  if (am.length >= 5) {
    const by = {}; am.forEach((r) => { (by[r.data.category] = by[r.data.category] || []).push(r.data.mood); });
    const ranked = Object.entries(by).filter(([, v]) => v.length >= 2).map(([k, v]) => [k, mean(v)]).sort((a, b) => b[1] - a[1]);
    if (ranked.length >= 2) add('activity-monitoring', `Your mood was highest during "${ranked[0][0]}" (${round(ranked[0][1], 1)}/10) and lowest during "${ranked.at(-1)[0]}" (${round(ranked.at(-1)[1], 1)}/10).`, ['lejuez2011', 'martell2001']);
  }

  const ep = of('exposure-practice').filter((r) => n(r.metrics?.likeBefore) != null && n(r.metrics?.likeAfter) != null);
  if (ep.length) { const d = mean(ep.map((r) => r.metrics.likeBefore - r.metrics.likeAfter)); add('exposure-practice', `In ${ep.length} exposure practice${ep.length > 1 ? 's' : ''}, your belief that the feared outcome would happen fell by ${round(d, 0)} percentage points on average — that gap between prediction and reality is how exposure works.`, ['craske2014', 'carpenter2018'], { value: round(d, 0), good: d > 0 }); }

  const be = of('behavioral-experiment').filter((r) => n(r.metrics?.shift) != null);
  if (be.length) { const d = mean(be.map((r) => -r.metrics.shift)); add('behavioral-experiment', `Your behavioural experiments reduced belief in the tested fear by ${round(d, 0)} points on average (${be.length} experiments).`, ['mcmillan2010']); }

  const us = of('urge-surfing').filter((r) => n(r.metrics?.peak) != null);
  if (us.length) { const rode = us.filter((r) => r.metrics.rode).length; add('urge-surfing', `You surfed ${us.length} urge${us.length > 1 ? 's' : ''} and rode out ${rode} (${Math.round((rode / us.length) * 100)}%). Average peak ${round(avgOf(us, 'peak'), 1)}/10, ending at ${round(avgOf(us, 'end'), 1)}/10 after about ${round(avgOf(us, 'minutes'), 0)} minutes — urges really do pass.`, ['bowen2009', 'bowen2014'], { value: rode, good: rode > 0 }); }

  const sd = of('sleep-diary').filter((r) => n(r.metrics?.efficiency) != null);
  if (sd.length) { const se = avgOf(sd, 'efficiency'); add('sleep-diary', `Your average sleep efficiency was ${round(se, 0)}% over ${sd.length} night${sd.length > 1 ? 's' : ''} (${se >= 85 ? 'in the healthy range of 85%+' : 'CBT for insomnia aims for 85% or more'}), with ${round(avgOf(sd, 'hours'), 1)} hours of sleep on average.`, ['trauer2015', 'vanstraten2018'], { value: round(se, 0), good: se >= 85 }); }

  const mv = of('move-for-mood').filter((r) => n(r.metrics?.boost) != null);
  if (mv.length) { const b = avgOf(mv, 'boost'); const mins = recs.filter((r) => r.type === 'move-for-mood').reduce((s, r) => s + (n(r.metrics?.minutes) || 0), 0); add('move-for-mood', `You logged ${mins} minutes of movement; on average your mood was ${round(b, 1)} points ${b >= 0 ? 'higher' : 'lower'} afterwards.`, ['noetel2024'], { value: round(b, 1), good: b >= 0 }); }

  const ev = of('estimate-vs-actual').filter((r) => n(r.metrics?.ratio) != null);
  if (ev.length >= 2) { const m = median(ev.map((r) => r.metrics.ratio)); add('estimate-vs-actual', `Your personal planning multiplier is ×${round(m, 2)}: tasks took ${m > 1 ? `${Math.round((m - 1) * 100)}% longer` : 'about as long as'} than you estimated (${ev.length} tasks). Multiply future estimates by this.`, ['buehler1994', 'kruger2004'], { value: round(m, 2) }); }

  const fs = of('focus-sprints');
  if (fs.length) { const mins = fs.reduce((s, r) => s + (n(r.metrics?.minutes) || 0), 0); add('focus-sprints', `${fs.length} focus sprint${fs.length > 1 ? 's' : ''} (${mins} minutes of focused work), average focus ${round(avgOf(fs, 'focus'), 1)}/10 with ${round(avgOf(fs, 'distractions'), 1)} distractions per sprint.`, ['biwer2023']); }

  const br = of('paced-breathing').concat(of('pmr')).concat(of('grounding')).filter((r) => n(r.metrics?.before) != null && n(r.metrics?.after) != null);
  if (br.length) { const d = mean(br.map((r) => r.metrics.before - r.metrics.after)); add('paced-breathing', `Calming practices (breathing, relaxation, grounding) lowered your tension or stress by ${round(d, 1)} points on average across ${br.length} sessions.`, ['zaccaro2018', 'manzoni2008'], { value: round(d, 1), good: d > 0 }); }

  const ac = of('anger-cool-down').filter((r) => n(r.metrics?.drop) != null);
  if (ac.length) add('anger-cool-down', `Your cool-down routine reduced anger by ${round(avgOf(ac, 'drop'), 1)} points on average (${ac.length} episodes).`, ['beck1998']);

  const ift = of('if-then-plans');
  if (ift.length) { const fol = ift.filter((r) => r.metrics?.followed === 1).length; add('if-then-plans', `You made ${ift.length} if–then plan${ift.length > 1 ? 's' : ''}${fol ? ` and followed through on ${fol}` : ''}. Specific plans like these roughly double the odds of acting on intentions in many studies.`, ['gollwitzer2006']); }

  const pl = of('progress-log');
  if (pl.length) add('progress-log', `${pl.length} progress log${pl.length > 1 ? 's' : ''} with ${recs.filter((r) => r.type === 'progress-log').reduce((s, r) => s + (n(r.metrics?.done) || 0), 0)} things done. Recording progress reliably boosts goal attainment.`, ['harkin2016']);

  const dd = of('desire-diary');
  if (dd.length >= 7) add('desire-diary', `You have ${dd.length} desire-diary entries — enough to look at what moves with your desire on the exercise’s History tab.`, ['mitchell2013']);
  return F;
}

/** Evidence-based narrative insights tying the user's data to the research. */
export function insights({ ov, trends, mood, findings, days }) {
  const out = [];
  const total = ov.exercises;
  if (total === 0 && !trends.length && !mood) {
    out.push({ tone: 'info', text: 'No entries in this period yet. Start with a check-in and one "Start here" exercise — even 10 minutes a few times a week adds up.', refs: ['mausbach2010'] });
    return out;
  }
  for (const t of trends) {
    if (!t.change) { out.push({ tone: 'info', text: `${t.name}: one score so far (${t.last}${t.percent ? '%' : ''}, ${t.band.label.toLowerCase()}). Re-take it in about two weeks to measure change.`, refs: t.validated ? ['lambert2018'] : [] }); continue; }
    const c = t.change;
    if (c.reliable && c.better) out.push({ tone: 'good', text: `${t.name} improved from ${t.first} to ${t.last}${t.percent ? '%' : ''} — a reliable improvement (a change of at least ${t.reliableChange} is unlikely to be chance).${c.recovered ? ' You have also moved below the clinical threshold: reliable recovery.' : ''}`, refs: t.validated ? ['jacobson1991', 'nhs-tt-manual'] : ['jacobson1991'] });
    else if (c.reliable && !c.better) out.push({ tone: 'warn', text: `${t.name} has worsened from ${t.first} to ${t.last}${t.percent ? '%' : ''}. That is a meaningful change — consider talking to a professional, and look at what has changed in your life recently.`, refs: ['lambert2018'] });
    else out.push({ tone: 'info', text: `${t.name} went from ${t.first} to ${t.last}${t.percent ? '%' : ''} — within normal ups and downs so far. Keep practising; reliable change often takes several weeks.`, refs: ['jacobson1991'] });
  }
  if (mood && mood.prevAvg != null && mood.avg != null) {
    const d = round(mood.avg - mood.prevAvg, 1);
    out.push({ tone: d >= 0 ? 'good' : 'warn', text: `Your average mood was ${mood.avg}/10 in this period, ${d >= 0 ? 'up' : 'down'} ${Math.abs(d)} from the previous ${days} days.`, refs: [] });
  }
  if (days && ov.checkinDays >= 2) {
    const rate = Math.round((ov.checkinDays / days) * 100);
    out.push({ tone: rate >= 60 ? 'good' : 'info', text: `You checked in on ${ov.checkinDays} of the last ${days} days (${rate}%)${ov.reflections ? ` and wrote ${ov.reflections} evening reflection${ov.reflections === 1 ? '' : 's'}` : ''}. Regular self-monitoring is linked to reaching goals more often.`, refs: ['harkin2016'] });
  }
  if (ov.activeDays >= 3) {
    const perWeek = days ? round((ov.exercises / days) * 7, 1) : null;
    out.push({ tone: 'info', text: `You practised on ${ov.activeDays} different days${perWeek != null ? ` (about ${perWeek} exercises a week)` : ''}. The amount of practice people do between sessions predicts how much they improve.`, refs: ['kazantzis2010', 'mausbach2010'] });
  }
  const topArea = Object.entries(ov.byArea).sort((a, b) => b[1] - a[1])[0];
  if (topArea && topArea[1] > 0) {
    const area = AREAS.find((a) => a.id === topArea[0]);
    const started = area.startHere.filter((id) => findings.some((f) => f.type === id) || ov.topExercises.some((t) => t.id === id));
    if (started.length < area.startHere.length) out.push({ tone: 'info', text: `Most of your practice was in ${area.name.toLowerCase()}. Its best-evidenced starting exercises are: ${area.startHere.map((id) => EXERCISE_BY_ID[id].title).join(' and ')}.`, refs: [], links: area.startHere });
  }
  return out;
}

/** Full pipeline as named steps, so the UI can show progress and time each step. */
export function reportSteps(allRecords, { days = 30, now = new Date() } = {}) {
  const ctx = { days, now };
  return [
    { label: 'Reading your entries from local storage', run: () => { ctx.all = allRecords.slice(); return `${ctx.all.length} entries`; } },
    { label: `Filtering to ${days ? `the last ${days} days` : 'all time'}`, run: () => { ctx.recs = filterPeriod(ctx.all, ctx); return `${ctx.recs.length} in period`; } },
    { label: 'Counting practice, streaks and areas', run: () => { ctx.ov = overview(ctx.recs, now); return `${ctx.ov.activeDays} active days`; } },
    { label: 'Scoring questionnaires & testing for reliable change', run: () => { ctx.trends = assessmentTrends(ctx.all, ctx.recs); return `${ctx.trends.length} questionnaires`; } },
    { label: 'Analysing mood trends', run: () => { ctx.mood = moodSummary(ctx.recs, ctx.all, days); return ctx.mood ? `${ctx.mood.count} mood logs` : 'no mood logs'; } },
    { label: 'Summarising exercise results', run: () => { ctx.findings = exerciseFindings(ctx.recs); return `${ctx.findings.length} findings`; } },
    { label: 'Linking results to the research', run: () => { ctx.insights = insights({ ov: ctx.ov, trends: ctx.trends, mood: ctx.mood, findings: ctx.findings, days }); return `${ctx.insights.length} insights`; } },
  ].map((s) => ({ ...s, ctx }));
}

export function buildReport(allRecords, opts = {}) {
  const steps = reportSteps(allRecords, opts);
  steps.forEach((s) => s.run());
  const { ov, trends, mood, findings, insights: ins, recs } = steps[0].ctx;
  return { overview: ov, trends, mood, findings, insights: ins, count: recs.length };
}
