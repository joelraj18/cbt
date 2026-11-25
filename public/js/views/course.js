// The self-guided CBT course: hub, weekly sessions (a step-by-step wizard), session notes and a printable
// clinician summary. Sessions follow the structure psychologists use in CBT (see views/standards.js).
import { html, raw, on, toast, confirmDialog, download } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { perf } from '../core/perf.js';
import { go } from '../core/router.js';
import { fmtDate, fmtDay, fmtNum, pct } from '../core/format.js';
import { COURSES, COURSE_BY_ID, SESSION_COUNT, MAINTAINERS, SUITABILITY, TRIGGERS, BODY, STRENGTHS, CORE_BELIEFS } from '../data/courses.js';
import { ASSESSMENT_BY_ID, scoreAssessment } from '../data/assessments.js';
import { AREA_BY_ID, areaColor } from '../data/areas.js';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises/index.js';
import { createForm } from '../ui/forms.js';
import { cycleBlock, mountCycles } from '../ui/cycle.js';
import { courseProgress, sessionPlan, triage, courseAlerts, measureSeries, outcome, homeworkStatus, sessionReminderEvents, boosterEvents,
  SAFETY_ITEM, courseRecords, sessionRecord, goalProgress, practisedDuring, answersFrom } from '../lib/therapy.js';
import { buildICS } from '../lib/ics.js';
import { lineChart } from '../lib/charts.js';
import { pageHead, cite, areaChip } from '../ui/components.js';
import { siteURL } from './today.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEASURE_KEY = /^(phq9|gad7|impact|checkin-[a-z-]+)_\d+$/;
const exTitle = (id) => EXERCISE_BY_ID[id]?.title || id;
const cites = (ids) => html`${(ids || []).map((id) => html` ${cite(id)}`)}`;
const citeStr = (id) => String(cite(id));
const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const EX_OPTIONS = EXERCISES.map((e) => ({ value: e.id, label: `${e.title} — ${AREA_BY_ID[e.area].short}` })).sort((a, b) => a.label.localeCompare(b.label));
const FREQ = ASSESSMENT_BY_ID.phq9.options.map((o) => ({ value: String(o.value), label: o.label }));

export async function getCourseState() { return (await store.kvGet('course', null)) || null; }

async function startCourse(id) {
  const prev = await getCourseState();
  if (prev) await archiveCourse(prev);
  await store.kvSet('course', { id, start: new Date().toISOString(), sessions: {}, goals: [], homework: [], sessionDay: new Date().getDay(), sessionTime: '18:00' });
  perf.event(`Started CBT course: ${id}`);
}
async function archiveCourse(prev) {
  const hist = (await store.kvGet('course-history', [])) || [];
  hist.push({ id: prev.id, start: prev.start, sessions: Object.keys(prev.sessions || {}).length, finishedAt: prev.finishedAt || null, ended: new Date().toISOString() });
  await store.kvSet('course-history', hist.slice(-20));
}

/* ------------------------------------------------------------------ shared bits */

const riskNote = () => html`<div class="callout-title">${icon('phone')} Thank you for telling us</div>
  <p style="margin:0 0 6px">Thoughts like these deserve support today. Please talk to someone — a crisis line, your doctor, or someone you trust. If you might act on them, call your local emergency number now.</p>
  <p style="margin:0"><a href="#/help">Get help now — crisis lines and your safety plan →</a></p>`;

function measureFields(id) {
  const a = ASSESSMENT_BY_ID[id];
  const options = [...a.options.map((o) => ({ value: String(o.value), label: o.label })), ...(a.allowNA ? [{ value: 'na', label: 'Doesn’t apply' }] : [])];
  const out = [{ type: 'info', id: `${id}__h`, tone: 'info', html: () => html`<div class="callout-title">${a.title}</div><p style="margin:0">${a.intro}</p>` }];
  a.items.forEach((q, i) => out.push({ id: `${id}_${i}`, type: 'radio', label: `${i + 1}. ${q}`, options, required: true, requiredMessage: 'Please choose an answer.' }));
  if (id === 'phq9') out.push({ id: 'phq9__risk', type: 'info', tone: 'crisis', showIf: (d) => Number(d.phq9_8) > 0, html: () => riskNote() });
  out.push({ id: `${id}__attr`, type: 'info', tone: 'plain', html: () => html`<span class="small faint">${a.validated ? '' : 'Original self-reflection questions, not a validated questionnaire. '}${a.attribution}</span>` });
  return out;
}

const safetyFields = () => [
  { id: 'safety', type: 'radio', label: SAFETY_ITEM, options: FREQ, required: true, help: 'We ask this every week. It is the same question as item 9 of the PHQ-9.' },
  { id: 'safety__risk', type: 'info', tone: 'crisis', showIf: (d) => Number(d.safety) > 0, html: () => riskNote() },
];

const goalFields = (state) => (state.goals || []).map((g, i) => ({ id: `goal_${i}`, type: 'slider', label: `Goal ${i + 1}: ${g.text}`, min: 0, max: 10,
  minLabel: '0 · not at all', maxLabel: '10 · fully there', help: g.how ? `You’ll know you’re there when: ${g.how}` : '' }));

function checkinStep(plan, state, { goals = true } = {}) {
  const fields = plan.measures.flatMap(measureFields);
  if (plan.safetyQuestion) fields.push(...safetyFields());
  if (goals && state.goals?.length) fields.push({ type: 'info', id: 'goals__h', tone: 'info', html: () => html`<div class="callout-title">Your goals</div><p style="margin:0">How close are you to each one this week?</p>` }, ...goalFields(state));
  return { title: 'Check-in: how you’ve been', short: 'Check-in', fields,
    intro: 'Answer about the <strong>last 2 weeks</strong>. Measuring every week, as psychological therapy services do, shows you — and anyone supporting you — what is really changing.' };
}

const summaryStep = (finalLabel = 'today') => ({ title: 'Summary and feedback', short: 'Summary', fields: [
  { id: 'takeaway', type: 'textarea', rows: 2, required: true, label: `In a sentence or two, what is the main thing you’re taking away from ${finalLabel}?` },
  { id: 'helpful', type: 'slider', label: 'How helpful was this session?', min: 0, max: 10, minLabel: '0 · not at all', maxLabel: '10 · very' },
  { id: 'unclear', type: 'textarea', rows: 2, label: 'Was anything unclear or unhelpful?', help: 'CBT therapists ask for feedback at the end of every session. Noticing what didn’t work helps you adapt the course to you.' },
] });

const homeworkListField = (defaults) => ({
  id: 'homework', type: 'list', label: 'Practice', rowLabel: 'Practice', minRows: 1, maxRows: 4, addLabel: 'Add another practice',
  default: () => defaults.map(([ex, perWeek]) => ({ ex, perWeek })),
  fields: [
    { id: 'ex', type: 'select', label: 'Exercise', options: EX_OPTIONS },
    { id: 'perWeek', type: 'number', label: 'How many times this week?', min: 1, max: 14, step: 1 },
  ],
  validate: (v) => ((v || []).some((r) => r.ex && EXERCISE_BY_ID[r.ex]) ? '' : 'Choose at least one practice.'),
});

function homeworkHTML(hw) {
  if (!hw.items.length) return html`<p class="muted" style="margin:0">No practice was set last time.</p>`;
  return html`<div class="hw-list">${hw.items.map((h) => html`<div class="hw-row ${h.complete ? 'complete' : ''}">
      <div><a href="#/exercise/${h.ex}?tab=history">${exTitle(h.ex)}</a><div class="small faint">${h.done} of ${h.perWeek} done</div></div>
      <div class="progress" role="progressbar" aria-label="${exTitle(h.ex)} practice" aria-valuenow="${Math.min(h.done, h.perWeek)}" aria-valuemin="0" aria-valuemax="${h.perWeek}"><span style="width:${Math.round(Math.min(1, h.done / h.perWeek) * 100)}%"></span></div></div>`)}</div>
    <p class="small" style="margin:10px 0 0"><strong>${pct(hw.adherence)}</strong> of the planned practice is done. ${hw.adherence >= 0.8 ? 'Excellent — practice between sessions is where change happens.' : hw.adherence >= 0.4 ? 'A good start. Doing more practice between sessions goes with better results.' : 'That’s okay — let’s look at what got in the way and make next week’s plan easier.'} ${cite('kazantzis2010')}</p>`;
}

function moduleHTML(mod) {
  const ex = EXERCISE_BY_ID[mod.ex];
  return html`<div class="stack" style="--gap:12px">
    <p style="margin:0;font-size:1.05rem">${mod.learn}</p>
    <div class="example-inline"><strong>Example:</strong> ${mod.example}</div>
    <p class="small muted" style="margin:0">The research:${cites(mod.refs)} · Today’s exercise: <a href="#/exercise/${ex.id}?tab=guide">${ex.title}</a> (evidence level ${ex.level})</p>
    <p class="small" style="margin:0"><strong>Questions to think about.</strong> A CBT therapist would ask you questions rather than give you answers — guided discovery helps people rethink ${cite('braun2015')}.</p></div>`;
}

function practiceHTML(exId) {
  const ex = EXERCISE_BY_ID[exId];
  return html`<p style="margin:0 0 10px">Do <strong>${ex.title}</strong> now (about ${ex.minutes} minutes). Your session is saved as a draft, so you can come straight back here.</p>
    <a class="btn primary" href="#/exercise/${ex.id}?tab=do&from=course">${icon('play')} Open ${ex.title}</a>`;
}

function triageHTML(t) {
  return html`<div class="callout ${t.tone}" style="margin:0"><div class="callout-title">${t.title}</div><p style="margin:0 0 8px">${t.text}${cites(t.refs)}</p>
    ${t.reasons.length ? html`<ul class="small" style="margin:0">${t.reasons.map((r) => html`<li>${r}</li>`)}</ul>` : ''}
    ${t.level === 'urgent' ? html`<p style="margin:8px 0 0"><a class="btn danger small" href="#/help">${icon('phone')} Get help now</a></p>` : ''}</div>`;
}

function userCycle(d, course) {
  const emo = (d.emotions || []).map((e) => `${e.name} (${e.v}%)`).join(', ');
  const ms = MAINTAINERS.filter((x) => (d.maintainers || []).includes(x.id));
  const techniques = [...new Set(ms.flatMap((x) => x.ex))].filter((id) => EXERCISE_BY_ID[id]).slice(0, 4).map(exTitle);
  return {
    id: 'mine', name: 'My example', title: 'Your CBT map',
    situation: d.situation || '—', thought: d.thought || '—', feeling: emo || '—', body: (d.body || []).join(', ') || '—', behaviour: d.behaviour || '—',
    result: [d.shortTerm && `Short term: ${d.shortTerm}`, d.longTerm && `Long term: ${d.longTerm}`].filter(Boolean).join(' · ') || ms.map((x) => x.label).join('; ') || '—',
    better: {
      thought: 'Catch thoughts like this one and weigh them up fairly (thought records, sessions 5–6 in many courses).',
      feeling: 'Feelings ease as thoughts and actions change — notice even small shifts.',
      body: 'Practise calming and grounding skills; notice sensations without fighting them.',
      behaviour: techniques.length ? `Swap what keeps it going for: ${techniques.join(', ')}.` : 'Small, planned actions that move you towards your goals.',
      result: course ? `Working towards your goals in “${course.name}”.` : 'Working towards your goals.',
    },
  };
}

function mapPreview(d, course) {
  const ms = MAINTAINERS.filter((x) => (d.maintainers || []).includes(x.id));
  return html`<div class="stack" style="--gap:12px">
    <div class="map-grid">
      ${[['Situation', d.situation], ['Thoughts', d.thought], ['Feelings', (d.emotions || []).map((e) => `${e.name} ${e.v}%`).join(', ')], ['Body', (d.body || []).join(', ')], ['Behaviour', d.behaviour]]
        .map(([k, v]) => html`<div class="map-box"><div class="k">${k}</div><div>${v || '—'}</div></div>`)}
    </div>
    ${d.shortTerm || d.longTerm ? html`<p class="small" style="margin:0">${d.shortTerm ? html`<strong>Short-term relief:</strong> ${d.shortTerm} ` : ''}${d.longTerm ? html`<strong>Long-term cost:</strong> ${d.longTerm}` : ''}</p>` : ''}
    ${ms.length ? html`<div><strong>What keeps it going, and the skills that target it</strong><ul class="small" style="margin:6px 0 0">${ms.map((x) => html`<li>${x.label} → ${x.ex.filter((id) => EXERCISE_BY_ID[id]).map((id, i) => html`${i ? ', ' : ''}<a href="#/exercise/${id}?tab=guide">${exTitle(id)}</a>`)}</li>`)}</ul></div>` : ''}
    ${(d.triggers || []).length ? html`<p class="small" style="margin:0"><strong>Triggers:</strong> ${d.triggers.join(', ')}</p>` : ''}
    ${(d.beliefs || []).length || d.rule || d.meaning ? html`<p class="small" style="margin:0"><strong>Deeper beliefs:</strong> ${[d.meaning, (d.beliefs || []).join('; ')].filter(Boolean).join(' · ')}${d.rule ? html` · Rule: “${d.rule}”` : ''}</p>` : ''}
    ${(d.strengths || []).length ? html`<p class="small" style="margin:0"><strong>Strengths:</strong> ${(d.strengths || []).join(', ')}${d.resources ? html` · <strong>What helps:</strong> ${d.resources}` : ''}</p>` : ''}
    ${(d.goals || []).filter((g) => g.text).length ? html`<div><strong>Goals</strong><ol class="small" style="margin:6px 0 0">${d.goals.filter((g) => g.text).map((g) => html`<li>${g.text}${g.how ? html` — <span class="muted">${g.how}</span>` : ''}${g.now != null ? html` <span class="badge">now ${g.now}/10</span>` : ''}</li>`)}</ol></div>` : ''}
    <p class="small muted" style="margin:0">A CBT map (case formulation) is a working hypothesis that you keep updating as you learn more ${cite('kuyken2009')}.</p></div>`;
}

/* ------------------------------------------------------------------ session schemas */

function assessmentSchema(course) {
  const extra = !['phq9', 'gad7'].includes(course.primary) ? measureFields(course.primary) : [];
  return { steps: [
    { title: 'What brings you here', short: 'About you', intro: 'Every course of CBT starts by understanding the problem in your own words.', fields: [
      { id: 'problem', type: 'textarea', rows: 4, required: true, label: 'In your own words, what is the main difficulty you want help with?', placeholder: 'e.g. I’ve felt low for months, I’ve stopped seeing friends and I can’t get going in the mornings.' },
      { id: 'duration', type: 'radio', required: true, label: 'How long has this been a problem?', options: ['Less than a month', '1–6 months', '6–12 months', '1–2 years', 'More than 2 years'] },
      { id: 'hopes', type: 'textarea', rows: 3, label: 'If this course helped, what would be different in your life?' },
      ...(course.medicalNote ? [{ type: 'info', id: 'medical', tone: 'warn', html: () => html`<div class="callout-title">Check with a doctor first if this applies</div><p style="margin:0">${course.medicalNote}</p>` }] : []),
    ] },
    { title: 'Mood', short: 'Mood', intro: 'Two standard questionnaires come first, whatever your focus — low mood and anxiety often sit underneath other difficulties.', fields: measureFields('phq9') },
    { title: 'Anxiety', short: 'Anxiety', fields: measureFields('gad7') },
    { title: 'Everyday life', short: 'Daily life', fields: [...measureFields('impact'), ...extra] },
    { title: 'Safety and suitability', short: 'Safety', intro: 'Some problems need a specialist assessment before — or alongside — self-help. Your answers stay on this device.', fields: [
      { id: 'suitability', type: 'checklist', label: 'Do any of these apply to you right now? Tick any that do.', options: SUITABILITY.map((s) => ({ value: s.id, label: s.label })) },
      { id: 'suit__urgent', type: 'info', tone: 'crisis', showIf: (d) => (d.suitability || []).some((x) => SUITABILITY.find((s) => s.id === x)?.urgent), html: () => riskNote() },
      { id: 'suit__note', type: 'info', tone: 'warn', showIf: (d) => (d.suitability || []).length > 0, html: () => html`<div class="callout-title">Please talk to a professional about this</div><p style="margin:0">These difficulties need a specialist assessment. Talk to your doctor or a mental health professional — you can still use this course alongside, with their agreement.</p>` },
    ] },
    { title: 'Support and your weekly session', short: 'Support', fields: [
      { id: 'supporter', type: 'radio', required: true, label: 'Is anyone supporting you with this?', options: [{ value: 'none', label: 'Not yet' }, { value: 'gp', label: 'My doctor' }, { value: 'therapist', label: 'A therapist, psychologist or counsellor' }, { value: 'trusted', label: 'A friend or family member' }] },
      { id: 'supporter__note', type: 'info', tone: 'good', showIf: (d) => d.supporter && d.supporter !== 'none', html: () => html`Good. After each session you can share your <strong>clinician summary</strong> with them — self-help works better with support ${cite('gellatly2007')}.` },
      { id: 'supporter__none', type: 'info', tone: 'info', showIf: (d) => d.supporter === 'none', html: () => html`That’s okay. If your scores are moderate or higher, consider asking your doctor to review your progress — it turns this into guided self-help ${cite('karyotaki2021')}.` },
      { id: 'medication', type: 'radio', label: 'Are you taking medication for your mental health?', options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }, { value: 'private', label: 'Prefer not to say' }] },
      { id: 'medication__note', type: 'info', tone: 'info', showIf: (d) => d.medication === 'yes', html: () => html`Keep taking it as prescribed and let your prescriber know you are doing a CBT course. Don’t stop or change medication without talking to them.` },
      { id: 'sessionDay', type: 'select', label: 'Which day suits your weekly session?', options: DAYS.map((d, i) => ({ value: String(i), label: d })), default: () => String(new Date().getDay()) },
      { id: 'sessionTime', type: 'time', label: 'What time?', default: '18:00' },
    ] },
    { title: 'Your recommended level of support', short: 'Result', fields: [
      { id: 'triage__view', type: 'info', tone: 'plain', html: (d) => triageHTML(triage({ phq9: answersFrom(d, 'phq9'), gad7: answersFrom(d, 'gad7'), impact: answersFrom(d, 'impact'), suitability: d.suitability || [] })) },
      { id: 'next__info', type: 'info', tone: 'info', html: () => html`<strong>Before session 2:</strong> notice when the problem shows up, using <a href="#/exercise/${course.monitoring.ex}?tab=do&from=course">${exTitle(course.monitoring.ex)}</a> (${course.monitoring.perWeek}× this week). ${course.monitoring.why} You’ll use what you notice to build your CBT map.` },
    ] },
    summaryStep(),
  ] };
}

function mapSchema(course, plan, state, records) {
  const mon = homeworkStatus(state.homework, records, state.sessions?.[1]?.at || state.start);
  return { steps: [
    checkinStep(plan, state, { goals: false }),
    { title: 'A recent example', short: 'Example', intro: 'Think of one recent time the problem showed up — the more specific, the better. CBT maps how thoughts, feelings, body sensations and behaviour feed each other.', fields: [
      { id: 'mon__info', type: 'info', tone: 'info', html: () => html`Your noticing this week: ${mon.items.length ? mon.items.map((h) => `${exTitle(h.ex)} ${h.done}×`).join(', ') : 'none set'}. Use one of those moments if you can.` },
      { id: 'situation', type: 'textarea', rows: 2, required: true, label: 'Situation: when and where was it, and who was there?', placeholder: 'e.g. Sunday evening, alone at home, thinking about work tomorrow' },
      { id: 'thought', type: 'textarea', rows: 2, required: true, label: 'Thoughts: what went through your mind?', placeholder: 'e.g. “I can’t face another week. I’m failing at everything.”' },
      { id: 'emotions', type: 'emotions', label: 'Feelings: which emotions, and how strong?' },
      { id: 'body', type: 'chips', label: 'Body: what did you notice physically?', options: BODY, allowCustom: true },
      { id: 'behaviour', type: 'textarea', rows: 2, required: true, label: 'Behaviour: what did you do — or feel like doing?', placeholder: 'e.g. Stayed in bed scrolling, cancelled plans' },
    ] },
    { title: 'What keeps it going?', short: 'What keeps it going', intro: 'Problems last because some ways of coping bring short-term relief but keep the problem going in the long run. The same processes keep many different problems going.', fields: [
      { id: 'maintainers', type: 'checklist', required: true, requiredMessage: 'Tick at least one — choose the closest match.', label: 'Which of these keep your problem going?', options: MAINTAINERS.map((x) => ({ value: x.id, label: x.label })) },
      { id: 'shortTerm', type: 'textarea', rows: 2, label: 'What do these do for you in the short term?', placeholder: 'e.g. I feel relieved; I avoid feeling embarrassed' },
      { id: 'longTerm', type: 'textarea', rows: 2, label: 'And what do they cost you in the long run?', placeholder: 'e.g. I see friends less, so I feel lonelier and lower' },
    ] },
    { title: 'Triggers and deeper beliefs', short: 'Beliefs', intro: 'Optional, but useful: what makes the problem more likely, and the beliefs underneath your thoughts.', fields: [
      { id: 'triggers', type: 'chips', label: 'What makes it more likely?', options: TRIGGERS, allowCustom: true },
      { id: 'meaning', type: 'textarea', rows: 2, label: 'If the thought from your example were true, what would it say about you?', help: 'This is the “downward arrow”: keep asking “and what would that mean?” until you reach a core belief.' },
      { id: 'beliefs', type: 'chips', label: 'Do any of these beliefs sound familiar?', options: CORE_BELIEFS, allowCustom: true },
      { id: 'rule', type: 'text', label: 'Any rules you live by?', placeholder: 'e.g. “I must never let anyone down.” “If I relax, things will go wrong.”' },
    ] },
    { title: 'Strengths and support', short: 'Strengths', intro: 'A good CBT map includes what you do well — your strengths are what you will build on.', fields: [
      { id: 'strengths', type: 'chips', label: 'Which strengths do you have? (Ask someone who knows you if you’re not sure.)', options: STRENGTHS, allowCustom: true },
      { id: 'resources', type: 'textarea', rows: 2, label: 'People, places and things that help you', placeholder: 'e.g. My sister, walks in the park, music' },
    ] },
    { title: 'Your goals', short: 'Goals', intro: 'Set 1–3 goals for the course. Make them specific: what would you be <em>doing</em> if things were better? Agreeing clear goals goes with better results in therapy.', fields: [
      { id: 'goals', type: 'list', label: 'Goals', rowLabel: 'Goal', minRows: 1, maxRows: 3, addLabel: 'Add a goal',
        validate: (v) => ((v || []).some((g) => g.text && g.text.trim()) ? '' : 'Write at least one goal.'),
        fields: [
          { id: 'text', type: 'text', label: 'What do you want to be doing?', placeholder: 'e.g. See a friend once a week' },
          { id: 'how', type: 'text', label: 'How will you know you’ve got there?', placeholder: 'e.g. Met up with someone 4 weeks in a row' },
          { id: 'now', type: 'slider', label: 'Where are you now? (0 = not at all, 10 = fully there)', min: 0, max: 10 },
        ] },
      { id: 'goals__ref', type: 'info', tone: 'plain', html: () => html`<span class="small muted">Why goals matter: agreement on goals was linked with better therapy outcomes across 54 studies ${cite('tryon2018')}.</span>` },
    ] },
    { title: 'Your CBT map', short: 'Your map', fields: [
      { id: 'map__view', type: 'info', tone: 'plain', html: (d) => mapPreview(d, course) },
      { id: 'map__next', type: 'info', tone: 'info', html: () => html`<strong>This week:</strong> keep noticing the pattern with <a href="#/exercise/${course.monitoring.ex}?tab=do&from=course">${exTitle(course.monitoring.ex)}</a> (${course.monitoring.perWeek}×). From session 3 you’ll start changing it, one skill at a time.` },
    ] },
    summaryStep(),
  ] };
}

function moduleSchema(course, plan, state, prog) {
  const mod = plan.module;
  return { steps: [
    checkinStep(plan, state),
    { title: 'Today’s agenda', short: 'Agenda', fields: [
      { id: 'agenda__list', type: 'info', tone: 'plain', html: () => html`<ol class="agenda"><li>Check-in <span class="badge ev-A">done</span></li><li>Review last week’s practice</li><li>Learn: <strong>${mod.title}</strong></li><li>Practise it now (${EXERCISE_BY_ID[mod.ex].minutes} min)</li><li>Plan this week’s practice</li><li>Summary and feedback</li></ol>` },
      { id: 'agendaExtra', type: 'text', label: 'Is there anything else you’d like to think about today?', placeholder: 'Optional — e.g. a difficult conversation coming up' },
    ] },
    { title: 'Review your practice', short: 'Review', intro: 'In CBT, a lot of the change happens between sessions, so each session starts by reviewing the practice. It is counted automatically from the exercises you saved.', fields: [
      { id: 'hw__view', type: 'info', tone: 'plain', html: () => homeworkHTML(prog.homework) },
      { id: 'learned', type: 'textarea', rows: 3, label: 'What did you notice or learn from your practice?' },
      { id: 'obstacles', type: 'textarea', rows: 2, label: 'What got in the way, if anything?', help: 'No judgement — obstacles are useful information for planning next week.' },
    ] },
    { title: mod.title, short: 'Learn', fields: [
      { id: 'learn__view', type: 'info', tone: 'plain', html: () => moduleHTML(mod) },
      { id: 'q1', type: 'textarea', rows: 2, label: mod.questions[0] },
      { id: 'q2', type: 'textarea', rows: 2, label: mod.questions[1] },
    ] },
    { title: 'Practise it now', short: 'Practise', fields: [
      { id: 'practice__view', type: 'info', tone: 'plain', html: () => practiceHTML(mod.ex) },
      { id: 'practised', type: 'checkbox', checkLabel: 'I’ve done the exercise (or I’ll do it straight after this session)' },
      { id: 'noticed', type: 'textarea', rows: 2, label: 'What did you notice while doing it?' },
    ] },
    { title: 'Plan this week’s practice', short: 'Plan', intro: 'Specific plans work far better than good intentions. Choose your practice, then decide exactly when and where.', fields: [
      homeworkListField(mod.homework),
      { id: 'when', type: 'textarea', rows: 2, required: true, label: 'When and where will you practise? Make it an if–then plan.', placeholder: 'e.g. If it’s 7 pm after dinner, then I’ll sit at the kitchen table and plan tomorrow’s activity.' },
      { id: 'obstacle', type: 'textarea', rows: 2, label: 'What might get in the way — and what will you do then?', placeholder: 'e.g. If I feel too tired, I’ll do just 5 minutes.' },
    ] },
    summaryStep(),
  ] };
}

function endingSchema(course, plan, state, records) {
  const used = practisedDuring(records, state.start);
  const top = used.slice(0, 2).map((u) => [u.ex, 3]);
  return { steps: [
    checkinStep(plan, state),
    { title: 'Look back', short: 'Look back', fields: [
      { id: 'look__view', type: 'info', tone: 'plain', html: (d) => lookBackHTML(state, records, plan, d) },
      { id: 'learnedAll', type: 'textarea', rows: 3, required: true, label: 'What have you learned about your problem and what keeps it going?' },
      { id: 'helped', type: 'chips', label: 'Which skills helped most?', options: used.slice(0, 10).map((u) => exTitle(u.ex)), allowCustom: true },
      { id: 'proud', type: 'textarea', rows: 2, label: 'What are you most proud of from these weeks?' },
    ] },
    { title: 'Your staying-well plan', short: 'Staying well', intro: `Setbacks are normal. A plan written now, while you feel more in control, helps you catch them early — psychological relapse prevention cut the risk of depression returning by about a third in trials ${citeStr('biesheuvel2015')}.`, fields: [
      { id: 'signs', type: 'chips', required: true, requiredMessage: 'Choose or add at least one warning sign.', label: 'My early warning signs', options: course.warningSigns, allowCustom: true },
      { id: 'plan', type: 'textarea', rows: 3, required: true, label: 'If I notice them, I will…', placeholder: 'e.g. Restart my activity schedule, message a friend, re-take my check-in and repeat one session of the course.' },
      { id: 'people', type: 'textarea', rows: 2, label: 'People who can help, and how to reach them' },
      { id: 'setback', type: 'textarea', rows: 2, label: 'If I have a bad day or week, I’ll remind myself…', placeholder: 'e.g. A lapse isn’t a relapse. I know what to do — start with one small step.' },
    ] },
    { title: 'Keep practising', short: 'Keep going', intro: 'Skills fade without use. Choose a little practice to keep in your week — you can change it any time.', fields: [
      homeworkListField(top.length ? top : course.modules[0].homework),
      { id: 'boost__info', type: 'info', tone: 'info', html: () => html`After you finish, you can add <strong>check-ups at 1, 3 and 6 months</strong> to your calendar: re-take your check-ins and read this plan.` },
    ] },
    summaryStep('the whole course'),
  ] };
}

function lookBackHTML(state, records, plan, d) {
  const course = COURSE_BY_ID[state.id];
  const rows = plan.measures.map((id) => {
    const a = ASSESSMENT_BY_ID[id];
    const first = measureSeries(records, id, state.start)[0];
    const ans = answersFrom(d, id);
    const now = ans ? scoreAssessment(a, ans).score : null;
    const o = first && now != null ? outcome(id, first.score, now) : null;
    return { a, first, now, o };
  }).filter((x) => x.first && x.now != null);
  const goals = goalProgress(state);
  return html`<div class="stack" style="--gap:12px">
    ${rows.length ? html`<div class="table-wrap"><table class="data"><thead><tr><th>Measure</th><th>Start</th><th>Now</th><th>What it means</th></tr></thead><tbody>
      ${rows.map((x) => html`<tr><td>${x.a.name}</td><td>${x.first.score}${x.a.percent ? '%' : ''}</td><td>${x.now}${x.a.percent ? '%' : ''}</td><td><span class="badge ${x.o.tone === 'good' ? 'ev-A' : x.o.tone === 'crisis' ? 'ev-D' : ''}">${x.o.label}</span></td></tr>`)}</tbody></table></div>` : ''}
    ${goals.length ? html`<div><strong>Your goals</strong><ul class="small" style="margin:6px 0 0">${goals.map((g, i) => { const v = num(d[`goal_${i}`]); return html`<li>${g.text}: ${g.first ?? '–'}/10 at the start → ${v ?? g.last ?? '–'}/10 now</li>`; })}</ul></div>` : ''}
    <p class="small muted" style="margin:0">Whatever the numbers say, you have spent ${Object.keys(state.sessions || {}).length + 1} weeks learning skills that ${course.name.toLowerCase().startsWith('lifting') ? 'protect your mood' : 'you can keep using'}. Reliable change uses NHS Talking Therapies thresholds ${cite('nhs-tt-manual')}.</p></div>`;
}

export function sessionSchema(state, plan, records, prog) {
  const course = COURSE_BY_ID[state.id];
  if (plan.stage === 'assessment') return assessmentSchema(course);
  if (plan.stage === 'map') return mapSchema(course, plan, state, records);
  if (plan.stage === 'ending') return endingSchema(course, plan, state, records);
  return moduleSchema(course, plan, state, prog);
}

/* ------------------------------------------------------------------ saving */

const cleanHomework = (rows) => (rows || []).filter((r) => r && EXERCISE_BY_ID[r.ex]).slice(0, 4).map((r) => ({ ex: r.ex, perWeek: Math.max(1, Math.min(14, Math.round(num(r.perWeek) || 1))) }));

export async function saveCourseSession(state, plan, data, records = store.all()) {
  const t0 = perf.now();
  const course = COURSE_BY_ID[state.id];
  const scores = {};
  for (const id of plan.measures) {
    const answers = answersFrom(data, id);
    if (!answers) continue;
    const a = ASSESSMENT_BY_ID[id];
    const s = scoreAssessment(a, answers);
    scores[id] = s.score;
    await store.add({ kind: 'assessment', type: id, area: a.area === 'general' ? null : a.area, data: { answers, source: 'course' }, metrics: { score: s.score } });
  }
  const clean = {};
  for (const [k, v] of Object.entries(data)) if (!MEASURE_KEY.test(k) && !k.includes('__')) clean[k] = v;
  const lastAt = Object.values(state.sessions || {}).map((s) => s.at).sort().at(-1) || null;
  const review = homeworkStatus(state.homework, records, lastAt);
  const tri = plan.stage === 'assessment' ? triage({ phq9: answersFrom(data, 'phq9'), gad7: answersFrom(data, 'gad7'), impact: answersFrom(data, 'impact'), suitability: data.suitability || [] }) : null;
  const rec = await store.add({ kind: 'course', type: 'session', area: course.area, data: {
    ...clean, course: course.id, n: plan.n, stage: plan.stage, title: plan.title, scores,
    ...(tri ? { triage: { level: tri.level, title: tri.title, reasons: tri.reasons } } : {}),
    ...(plan.n > 1 ? { practiceReview: review.items, practiceSet: state.homework || [] } : {}),
    ...(data.safety != null && data.safety !== '' ? { safety: Number(data.safety) } : {}),
  }, metrics: { helpful: num(data.helpful), adherence: plan.n > 1 ? review.adherence : null } });
  const next = { ...state, sessions: { ...(state.sessions || {}), [plan.n]: { at: rec.createdAt, rec: rec.id } }, early: false };
  if (plan.stage === 'assessment') {
    Object.assign(next, { supporter: data.supporter || 'none', sessionDay: Number(data.sessionDay ?? new Date().getDay()), sessionTime: data.sessionTime || '18:00', triage: tri.level,
      homework: [{ ex: course.monitoring.ex, perWeek: course.monitoring.perWeek }] });
  } else if (plan.stage === 'map') {
    next.goals = (data.goals || []).filter((g) => g && g.text && g.text.trim()).slice(0, 3).map((g) => ({ text: g.text.trim(), how: (g.how || '').trim(), ratings: [{ at: rec.createdAt, v: num(g.now) ?? 0 }] }));
    next.homework = [{ ex: course.monitoring.ex, perWeek: course.monitoring.perWeek }];
  } else {
    next.goals = (state.goals || []).map((g, i) => ({ ...g, ratings: [...(g.ratings || []), ...(num(data[`goal_${i}`]) != null ? [{ at: rec.createdAt, v: num(data[`goal_${i}`]) }] : [])] }));
    next.homework = cleanHomework(data.homework);
    if (plan.stage === 'ending') next.finishedAt = rec.createdAt;
  }
  await store.kvSet('course', next);
  perf.event(`Saved CBT course session ${plan.n}`, perf.now() - t0, `${Object.keys(scores).length} questionnaires scored`);
  return { record: rec, state: next, triage: tri };
}

/* ------------------------------------------------------------------ views */

function chooser() {
  return html`<div class="container">
    ${pageHead({ title: 'Your CBT course', lede: 'Eight weekly sessions of self-guided CBT, built the way psychologists deliver it: an assessment, a personal CBT map, five skill sessions and a staying-well plan. Each session takes about 25–30 minutes, plus 10–15 minutes of practice on most days.' })}
    <ol class="course-phases">
      <li><strong>1 · Assessment</strong><span>Your problem in your words, standard questionnaires, safety, and the level of support that suits you</span></li>
      <li><strong>2 · Your CBT map</strong><span>What keeps the problem going — and goals you can measure</span></li>
      <li><strong>3–7 · Skills</strong><span>One evidence-based skill a week, practised between sessions</span></li>
      <li><strong>8 · Staying well</strong><span>What changed, your relapse-prevention plan and check-ups</span></li>
    </ol>
    <h2 class="section">Choose your focus</h2>
    <div class="grid" style="--min:300px">${COURSES.map((c) => html`<article class="card area-card" style="--area:${areaColor(c.area)}">
      <div class="cluster" style="--gap:6px;margin-bottom:8px">${areaChip(c.area)}<span class="badge">8 sessions</span></div>
      <h3 style="margin:0 0 6px">${c.name}</h3><p class="small muted">${c.summary}</p>
      <p class="small" style="margin:0 0 10px"><strong>Based on:</strong> ${c.basis}${cites(c.refs.slice(0, 2))}</p>
      <details class="more small"><summary>The sessions</summary><ol style="margin:6px 0 0">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => html`<li>${sessionPlan(c.id, n).title}</li>`)}</ol></details>
      <div class="cluster" style="margin-top:12px"><button class="btn primary small" data-start-course="${c.id}">${icon('play')} Start this course</button></div></article>`)}</div>
    <section class="section grid-2">
      <div class="card"><h2 class="h3">${icon('flask')} Does self-guided CBT work?</h2><ul class="small" style="margin:0">
        <li>In trials that compared them directly, guided self-help worked about as well as face-to-face therapy ${cite('cuijpers2010gsh')}.</li>
        <li>Guided internet CBT and in-person CBT had equivalent effects in head-to-head trials ${cite('carlbring2018')}.</li>
        <li>Self-guided internet CBT helps too — but with moderate or worse symptoms, adding support from a person helps more ${cite('karyotaki2021')}.</li>
        <li>Self-help works best with someone supporting you ${cite('gellatly2007')} — so the course makes a clinician summary you can share.</li></ul></div>
      <div class="card"><h2 class="h3">${icon('shield')} What this course is — and isn’t</h2><ul class="small" style="margin:0">
        <li>It follows the structure and methods psychologists use in CBT, with every source cited. <a href="#/standards">See the clinical standards →</a></li>
        <li>It is <strong>not</strong> therapy with a psychologist and it can’t diagnose. It suits mild to moderate difficulties.</li>
        <li>Session 1 checks safety and recommends the right level of support — including when to see a professional first.</li>
        <li>Everything stays on this device. Nothing is sent to us or anyone else.</li></ul></div>
    </section>
    <div class="callout warn section"><div class="callout-title">${icon('alert')} See a professional first if any of these apply to you</div><ul class="small" style="margin:0">${SUITABILITY.map((s) => html`<li>“${s.label}”</li>`)}</ul><p style="margin:8px 0 0">You can still use the course alongside professional help. <a href="#/help">Get help now →</a></p></div>
  </div>`;
}

function alertCallout(a) {
  return html`<div class="callout ${a.tone}" style="margin-bottom:12px"><div class="callout-title">${icon(a.tone === 'crisis' ? 'phone' : 'alert')} ${a.title}</div><p style="margin:0">${a.text}${cites(a.refs)}</p>
    ${a.id === 'risk' ? html`<p style="margin:8px 0 0"><a class="btn danger small" href="#/help">${icon('phone')} Get help now</a></p>` : ''}</div>`;
}

export async function courseView({ query = {} } = {}) {
  const state = await getCourseState();
  const records = store.all();
  const now = new Date();
  if (!state || !COURSE_BY_ID[state.id]) {
    return { title: 'CBT course', body: chooser(), mount: (root) => on(root, 'click', '[data-start-course]', async (e, b) => { await startCourse(b.dataset.startCourse); toast('Course started — session 1 is ready.'); go('/course/session'); }) };
  }
  const prog = courseProgress(state, records, now);
  const c = prog.course;
  const alerts = courseAlerts(state, records, now);
  const s1 = sessionRecord(records, state, 1)?.data;
  const map = sessionRecord(records, state, 2)?.data;
  const goals = goalProgress(state);
  const primary = ASSESSMENT_BY_ID[c.primary];
  const series = measureSeries(records, c.primary, state.start);
  const o = series.length > 1 ? outcome(c.primary, series[0].score, series.at(-1).score) : null;
  const justDone = Number(query.done) || null;
  const plan = prog.plan;

  const nextCard = prog.finished
    ? html`<section class="card course-next done"><div class="eyebrow">Course complete</div><h2 style="margin:4px 0 8px">Well done — you finished all 8 sessions</h2>
        <p>Keep your staying-well plan handy, keep a little practice in your week, and book check-ups with yourself.</p>
        <div class="cluster"><button class="btn primary" data-boosters>${icon('calendar')} Add check-ups at 1, 3 and 6 months</button><a class="btn" href="#/course/session/8">Read my staying-well plan</a><a class="btn ghost" href="#/course/summary">Clinician summary</a><button class="btn ghost" data-new-course>Start another course</button></div></section>`
    : prog.due
      ? html`<section class="card course-next"><div class="eyebrow">${prog.next === 1 ? 'Start here' : 'Ready now'} · about ${plan.minutes} minutes</div><h2 style="margin:4px 0 6px">Session ${prog.next}: ${plan.title}</h2><p class="muted" style="margin:0 0 12px">${plan.aim}</p>
          <a class="btn primary" href="#/course/session">${icon('play')} Start session ${prog.next}</a></section>`
      : html`<section class="card course-next"><div class="eyebrow">Next session</div><h2 style="margin:4px 0 6px">Session ${prog.next}: ${plan.title}</h2>
          <p class="muted" style="margin:0 0 12px">Unlocks on <strong>${fmtDay(prog.dueAt)}</strong> (in ${prog.daysUntilDue} day${prog.daysUntilDue === 1 ? '' : 's'}). A week between sessions leaves time to practise — that is where change happens.</p>
          <div class="cluster"><button class="btn" data-early>Start it now anyway</button><a class="btn ghost" href="#/today">Today’s practice</a></div></section>`;

  const body = html`<div class="container" style="--area:${areaColor(c.area)}">
    ${pageHead({ crumbs: [{ label: 'CBT course', href: '#/course' }, { label: c.name }], title: c.name, lede: `${prog.completed} of ${SESSION_COUNT} sessions done · started ${fmtDate(state.start)}`,
      actions: html`<div class="cluster"><a class="btn small" href="#/course/summary">${icon('clipboard')} Clinician summary</a><a class="btn small ghost" href="#/standards">${icon('shield')} Clinical standards</a></div>` })}
    <p class="small muted" style="margin:-10px 0 18px">Based on ${c.basis.charAt(0).toLowerCase() + c.basis.slice(1)}${cites(c.refs.slice(0, 2))}</p>
    ${justDone ? html`<div class="callout good" style="margin-bottom:12px"><div class="callout-title">${icon('check')} Session ${justDone} saved</div><p style="margin:0">${justDone === SESSION_COUNT ? 'You have completed the course.' : 'Your practice for this week is on your Today page, and it counts automatically when you save each exercise.'}</p></div>` : ''}
    ${alerts.map(alertCallout)}
    ${s1?.triage ? html`<details class="callout ${s1.triage.level === 'urgent' ? 'crisis' : s1.triage.level === 'professional' ? 'warn' : s1.triage.level === 'guided' ? 'info' : 'good'}" style="margin-bottom:12px"><summary><strong>Recommended support:</strong> ${s1.triage.title}</summary><ul class="small" style="margin:8px 0 0">${(s1.triage.reasons || []).map((r) => html`<li>${r}</li>`)}</ul><p class="small" style="margin:6px 0 0"><a href="#/course/session/1">Session 1 notes</a></p></details>` : ''}
    <div class="grid-2 wide-left section" style="margin-top:8px">
      <div class="stack" style="--gap:20px">
        ${nextCard}
        ${!prog.finished && prog.homework.items.length ? html`<section class="card"><h2 class="h3">${icon('list')} This week’s practice</h2>${homeworkHTML(prog.homework)}
          <p class="small" style="margin:10px 0 0">${prog.homework.items.map((h, i) => html`${i ? ' · ' : ''}<a href="#/exercise/${h.ex}?tab=do">Do ${exTitle(h.ex)}</a>`)}</p></section>` : ''}
        <section class="card"><h2 class="h3">${icon('chart')} ${primary.name} over the course</h2>
          ${series.length ? html`<div data-chart></div>` : html`<p class="muted small" style="margin:0">Your scores will appear here after session 1.</p>`}
          ${o ? html`<p style="margin:10px 0 0"><span class="badge ${o.tone === 'good' ? 'ev-A' : o.tone === 'crisis' ? 'ev-D' : ''}">${o.label}</span> ${series[0].score}${primary.percent ? '%' : ''} → ${series.at(-1).score}${primary.percent ? '%' : ''} since you started.</p>` : ''}
          <p class="small muted" style="margin:6px 0 0">${primary.higherIsWorse ? 'Lower is better.' : 'Higher is better.'} ${primary.validated ? `A change of ${primary.reliableChange} or more is a reliable change (NHS Talking Therapies).` : 'Original, unvalidated check — use it to see your own trend.'}</p></section>
        ${map ? html`<section>${cycleBlock([userCycle(map, c)], { id: 'mymap', intro: 'Your CBT map from session 2. Switch to <strong>Breaking the cycle</strong> to see how the course targets each part.' })}</section>` : ''}
      </div>
      <aside class="stack" style="--gap:20px">
        <section class="card"><h2 class="h3">${icon('map')} Your sessions</h2><ol class="program-days compact">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
          const p = sessionPlan(c.id, n), done = !!state.sessions?.[n], cur = n === prog.next;
          return html`<li class="pday ${done ? 'done' : cur ? 'current' : ''}"><div class="pday-num" aria-hidden="true">${done ? '✓' : n}</div><div><div class="small"><strong>${done ? html`<a href="#/course/session/${n}">Session ${n}: ${p.title}</a>` : `Session ${n}: ${p.title}`}</strong></div>
            <div class="small faint">${done ? fmtDate(state.sessions[n].at, { day: 'numeric', month: 'short' }) : cur ? (prog.due ? 'Ready now' : `From ${fmtDay(prog.dueAt)}`) : `${p.minutes} min`}</div></div></li>`; })}</ol></section>
        ${goals.length ? html`<section class="card"><h2 class="h3">${icon('target')} Your goals</h2>${goals.map((g) => html`<div style="margin-bottom:10px"><div class="small"><strong>${g.text}</strong></div>
          <div class="progress" role="progressbar" aria-label="Goal progress" aria-valuenow="${g.last ?? 0}" aria-valuemin="0" aria-valuemax="10"><span style="width:${(g.last ?? 0) * 10}%"></span></div>
          <div class="small faint">${g.first ?? '–'}/10 at the start → ${g.last ?? '–'}/10 now</div></div>`)}</section>` : ''}
        <section class="card flat"><h2 class="h3">${icon('calendar')} Weekly session reminder</h2>
          <form data-sched class="stack" style="--gap:10px">
            <div class="cluster"><label class="small" for="cs-day" style="min-width:60px">Day</label><select id="cs-day" style="width:auto">${DAYS.map((d, i) => html`<option value="${i}" ${Number(state.sessionDay) === i ? raw('selected') : ''}>${d}</option>`)}</select></div>
            <div class="cluster"><label class="small" for="cs-time" style="min-width:60px">Time</label><input type="time" id="cs-time" value="${state.sessionTime || '18:00'}" style="width:auto"></div>
            <div class="cluster"><button class="btn small" type="submit">Save</button><button class="btn small soft" type="button" data-ics>${icon('calendar')} Add to my calendar</button></div>
          </form></section>
        <section class="card flat"><h2 class="h3">${icon('shield')} Sharing and support</h2>
          <p class="small">The <a href="#/course/summary">clinician summary</a> brings together your scores, CBT map, goals and practice on one printable page — useful for your doctor, therapist or supporter. Nothing is shared unless you print or send it yourself.</p>
          <div class="cluster"><button class="btn small ghost" data-new-course>Switch course</button><button class="btn small ghost" data-stop-course>Stop the course</button></div></section>
      </aside>
    </div>
  </div>`;

  const mount = (root) => {
    const offs = [];
    const chartEl = root.querySelector('[data-chart]');
    if (chartEl) offs.push(lineChart(chartEl, { caption: `${primary.name} scores during the course`, yMin: 0, yMax: primary.max, bands: primary.chartBands, height: 210,
      format: (v) => `${fmtNum(v)}${primary.percent ? '%' : ''}`, series: [{ name: primary.name, color: 'var(--s1)', points: series.map((p) => ({ x: p.at, y: p.score })) }] }));
    if (map) offs.push(mountCycles(root, { mymap: [userCycle(map, c)] }));
    offs.push(
      on(root, 'click', '[data-early]', async () => { await store.kvSet('course', { ...state, early: true }); go('/course/session'); }),
      on(root, 'submit', '[data-sched]', async (e) => { e.preventDefault(); await store.kvSet('course', { ...state, sessionDay: Number(root.querySelector('#cs-day').value), sessionTime: root.querySelector('#cs-time').value || '18:00' }); toast('Saved.'); }),
      on(root, 'click', '[data-ics]', () => {
        const st = { ...state, sessionDay: Number(root.querySelector('#cs-day').value), sessionTime: root.querySelector('#cs-time').value || '18:00' };
        const ev = sessionReminderEvents(st, `${siteURL()}#/course`);
        if (!ev.length) { toast('No sessions left to remind you about.'); return; }
        download('cbt-course-sessions.ics', buildICS(ev, { calName: 'CBT course' }), 'text/calendar');
        toast('Calendar file downloaded — open it to add your weekly sessions.');
      }),
      on(root, 'click', '[data-boosters]', () => { download('cbt-check-ups.ics', buildICS(boosterEvents(new Date(), `${siteURL()}#/course`), { calName: 'CBT check-ups' }), 'text/calendar'); toast('Check-ups downloaded — open the file to add them to your calendar.'); }),
      on(root, 'click', '[data-stop-course]', async () => { if (!(await confirmDialog({ title: 'Stop the course?', body: 'Your sessions, scores and notes are kept in your journal. You can start a course again any time.', confirm: 'Stop course' }))) return; await archiveCourse(state); await store.kvDel('course'); toast('Course stopped.'); go('/course', {}, { replace: true }); }),
      on(root, 'click', '[data-new-course]', async () => { if (!prog.finished && !(await confirmDialog({ title: 'Switch to a different course?', body: 'Your current course progress is archived. Your entries are kept.', confirm: 'Choose another course' }))) return; await archiveCourse(state); await store.kvDel('course'); go('/course', {}, { replace: true }); }),
    );
    return () => offs.forEach((f) => f && f());
  };
  return { title: `CBT course: ${c.name}`, body, mount };
}

/* ---- running a session, or reading the notes of a finished one ---- */

export async function courseSessionView({ params = {} } = {}) {
  const state = await getCourseState();
  if (!state || !COURSE_BY_ID[state.id]) {
    return { title: 'CBT course', body: html`<div class="container narrow"><div class="empty"><h1>No course started yet</h1><p>Choose a focus to start your 8-session CBT course.</p><a class="btn primary" href="#/course">Choose a course</a></div></div>` };
  }
  const records = store.all();
  if (params.n) return sessionNotesView(state, records, Number(params.n));
  const prog = courseProgress(state, records, new Date());
  const c = prog.course;
  if (prog.finished) {
    return { title: 'Course complete', body: html`<div class="container narrow"><div class="empty"><h1>You’ve finished the course</h1><p>All 8 sessions are done. Read your staying-well plan or share your summary.</p><div class="cluster" style="justify-content:center"><a class="btn primary" href="#/course">Back to the course</a><a class="btn" href="#/course/session/8">My staying-well plan</a></div></div></div>` };
  }
  const plan = prog.plan;
  if (!prog.due) {
    return { title: `Session ${plan.n}`, body: html`<div class="container narrow">${pageHead({ crumbs: [{ label: 'CBT course', href: '#/course' }, { label: `Session ${plan.n}` }], title: `Session ${plan.n}: ${plan.title}`, lede: `This session unlocks on ${fmtDay(prog.dueAt)}.` })}
      <div class="callout info"><div class="callout-title">${icon('calendar')} Time to practise first</div><p style="margin:0 0 10px">A week between sessions leaves time for the practice you planned. It is counted automatically on your Today page.</p>
      <div class="cluster"><button class="btn primary" data-early>Start it now anyway</button><a class="btn" href="#/today">Today’s practice</a></div></div></div>`,
    mount: (root) => on(root, 'click', '[data-early]', async () => { await store.kvSet('course', { ...state, early: true }); go('/course/session', {}, { replace: true }); }) };
  }
  const schema = sessionSchema(state, plan, records, prog);
  const body = html`<div class="container narrow" style="--area:${areaColor(c.area)}">
    ${pageHead({ crumbs: [{ label: 'CBT course', href: '#/course' }, { label: c.name, href: '#/course' }, { label: `Session ${plan.n}` }], title: `Session ${plan.n}: ${plan.title}`,
      lede: plan.stage === 'module' ? html`About ${plan.minutes} minutes: check in, review your practice, learn and practise one skill, then plan your week.${cites(plan.refs)}` : html`About ${plan.minutes} minutes. ${plan.aim}${cites(plan.refs)}` })}
    <h2 class="sr-only">Session steps</h2>
    <div class="course-form" data-form></div>
    <p class="small faint" style="margin-top:14px">Your answers are saved as a draft on this device as you go. Questionnaire scores are added to your check-in history and reports.</p>
  </div>`;
  const mount = (root) => {
    const form = createForm(root.querySelector('[data-form]'), schema, {
      draftKey: `course:${c.id}:${plan.n}:${state.start}`,
      saveLabel: plan.n === SESSION_COUNT ? 'Finish the course' : `Finish session ${plan.n}`,
      onSave: async (data) => {
        const res = await saveCourseSession(state, plan, data, store.all());
        toast(plan.n === SESSION_COUNT ? 'Course complete — well done!' : `Session ${plan.n} saved.`);
        go('/course', { done: String(plan.n) });
        return res;
      },
    });
    return () => form.destroy();
  };
  return { title: `Session ${plan.n}: ${plan.title}`, body, mount };
}

function fmtValue(f, v) {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return null;
  switch (f.type) {
    case 'checkbox': return v ? 'Yes' : null;
    case 'slider': return `${v}/${f.max ?? 10}`;
    case 'radio': case 'select': { const o = (f.options || []).map((x) => (typeof x === 'string' ? { value: x, label: x } : x)).find((x) => String(x.value) === String(v)); return o ? o.label : String(v); }
    case 'checklist': return (f.options || []).filter((o) => v.includes(o.value)).map((o) => o.label).join('; ');
    case 'chips': return v.join(', ');
    case 'emotions': return v.map((e) => `${e.name} ${e.v}%`).join(', ');
    case 'list': return v.map((row) => f.fields.map((sf) => (sf.id === 'ex' ? exTitle(row.ex) : sf.id === 'perWeek' ? `× ${row.perWeek}` : sf.type === 'slider' ? (row[sf.id] != null ? `${row[sf.id]}/10` : '') : row[sf.id])).filter(Boolean).join(' · ')).filter(Boolean).join('\n');
    default: return String(v);
  }
}

function sessionNotesView(state, records, n) {
  const c = COURSE_BY_ID[state.id];
  const rec = sessionRecord(records, state, n);
  const plan = sessionPlan(c.id, n);
  if (!rec || !plan) {
    return { title: 'Session notes', body: html`<div class="container narrow"><div class="empty"><h1>No notes for this session yet</h1><p>Notes appear here once you finish the session.</p><a class="btn primary" href="#/course">Back to the course</a></div></div>` };
  }
  const d = rec.data || {};
  const prog = courseProgress(state, records, new Date());
  const schema = sessionSchema({ ...state, goals: state.goals || [] }, plan, records, prog);
  const sections = n === 2 ? [] : schema.steps.map((s) => ({ title: s.title, rows: s.fields.filter((f) => f.id && !['info', 'computed'].includes(f.type) && !MEASURE_KEY.test(f.id) && f.id !== 'safety')
    .map((f) => [f.label || f.checkLabel || f.id, fmtValue(f, d[f.id])]).filter(([, v]) => v) })).filter((s) => s.rows.length);
  const scores = Object.entries(d.scores || {}).filter(([id]) => ASSESSMENT_BY_ID[id]);
  const body = html`<div class="container narrow">
    ${pageHead({ crumbs: [{ label: 'CBT course', href: '#/course' }, { label: `Session ${n} notes` }], title: `Session ${n}: ${plan.title}`, lede: `Completed ${fmtDate(rec.createdAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` })}
    ${d.triage ? html`<div class="callout ${d.triage.level === 'urgent' ? 'crisis' : d.triage.level === 'professional' ? 'warn' : 'info'}"><div class="callout-title">Recommended support: ${d.triage.title}</div><ul class="small" style="margin:0">${(d.triage.reasons || []).map((r) => html`<li>${r}</li>`)}</ul></div>` : ''}
    ${scores.length ? html`<section class="card" style="margin-top:14px"><h2 class="h3">Scores this session</h2><div class="cluster">${scores.map(([id, s]) => { const a = ASSESSMENT_BY_ID[id]; const b = a.bands.find((x) => s >= x.min && s <= x.max); return html`<span class="badge">${a.name}: ${s}${a.percent ? '%' : ''}${b ? ` · ${b.label}` : ''}</span>`; })}</div></section>` : ''}
    ${(d.practiceReview || []).length ? html`<section class="card" style="margin-top:14px"><h2 class="h3">Practice since the previous session</h2><ul class="small" style="margin:0">${d.practiceReview.map((h) => html`<li>${exTitle(h.ex)}: ${h.done} of ${h.perWeek}</li>`)}</ul></section>` : ''}
    ${n === 2 ? html`<section class="card" style="margin-top:14px"><h2 class="h3">Your CBT map</h2>${mapPreview(d, c)}</section>` : ''}
    ${sections.map((s) => html`<section class="card flat" style="margin-top:14px"><h2 class="h3">${s.title}</h2><dl class="kv">${s.rows.map(([k, v]) => html`<dt>${k}</dt><dd style="white-space:pre-line">${v}</dd>`)}</dl></section>`)}
    <div class="cluster section"><a class="btn" href="#/course">${icon('back')} Back to the course</a><a class="btn ghost" href="#/course/summary">Clinician summary</a></div>
  </div>`;
  return { title: `Session ${n} notes`, body };
}

/* ---- printable summary for a doctor, therapist or supporter ---- */

export async function courseSummaryView() {
  const state = await getCourseState();
  const records = store.all();
  if (!state || !COURSE_BY_ID[state.id]) {
    return { title: 'Clinician summary', body: html`<div class="container narrow"><div class="empty"><h1>Clinician summary</h1><p>Start a CBT course first — the summary fills in as you complete sessions.</p><a class="btn primary" href="#/course">Choose a course</a></div></div>` };
  }
  const now = new Date();
  const c = COURSE_BY_ID[state.id];
  const prog = courseProgress(state, records, now);
  const s1 = sessionRecord(records, state, 1)?.data;
  const map = sessionRecord(records, state, 2)?.data;
  const end = sessionRecord(records, state, 8)?.data;
  const sessions = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n, plan: sessionPlan(c.id, n), rec: state.sessions?.[n] ? sessionRecord(records, state, n) : null })).filter((x) => x.rec);
  const ids = ['phq9', 'gad7', c.primary, 'impact'].filter((id, i, a) => a.indexOf(id) === i);
  const measures = ids.map((id) => ({ id, a: ASSESSMENT_BY_ID[id], pts: measureSeries(records, id, state.start) })).filter((x) => x.pts.length);
  const risk = [
    ...measureSeries(records, 'phq9', state.start).filter((p) => Number(p.answers[8]) > 0).map((p) => ({ at: p.at, what: `PHQ-9 item 9 answered “${ASSESSMENT_BY_ID.phq9.options[Number(p.answers[8])]?.label}”` })),
    ...courseRecords(records, c.id).filter((r) => Number(r.data?.safety) > 0).map((r) => ({ at: r.createdAt, what: `Weekly safety question answered “${FREQ[Number(r.data.safety)]?.label}”` })),
    ...(s1?.suitability || []).map((id) => ({ at: sessionRecord(records, state, 1).createdAt, what: `Suitability screen: “${SUITABILITY.find((s) => s.id === id)?.label}”` })),
  ].sort((a, b) => (a.at < b.at ? -1 : 1));
  const goals = goalProgress(state);
  const adh = sessions.map((s) => s.rec.metrics?.adherence).filter((x) => x != null);
  const avgAdh = adh.length ? adh.reduce((a, b) => a + b, 0) / adh.length : null;
  const ms = MAINTAINERS.filter((x) => (map?.maintainers || []).includes(x.id));
  const SUP = { none: 'None yet', gp: 'Doctor', therapist: 'Therapist, psychologist or counsellor', trusted: 'Friend or family member' };

  const body = html`<div class="container narrow summary-doc">
    <div class="split no-print" style="margin-bottom:10px"><a class="btn small ghost" href="#/course">${icon('back')} Back to the course</a><button class="btn small" data-print>${icon('print')} Print or save as PDF</button></div>
    <h1 style="margin-bottom:4px">CBT course summary</h1>
    <p class="muted" style="margin-top:0">${c.name} · generated ${fmtDate(now, { day: 'numeric', month: 'long', year: 'numeric' })} · CBT Toolkit (self-guided)</p>
    <div class="callout info"><p style="margin:0">Self-reported data from a self-guided CBT course completed on the person’s own device. It is not a clinical assessment or diagnosis. Course content and sources: ${siteURL()}#/standards</p></div>

    <h2>Overview</h2>
    <dl class="kv">
      <dt>Course</dt><dd>${c.name} — ${c.basis}</dd>
      <dt>Started</dt><dd>${fmtDate(state.start)}</dd>
      <dt>Sessions completed</dt><dd>${prog.completed} of ${SESSION_COUNT}${prog.finished ? ' (finished)' : prog.next ? ` · next: session ${prog.next}, ${prog.due ? 'due now' : `from ${fmtDay(prog.dueAt)}`}` : ''}</dd>
      <dt>Practice completed</dt><dd>${avgAdh != null ? `${pct(avgAdh)} of planned between-session practice (average)` : 'Not yet measured'}</dd>
      <dt>Support</dt><dd>${SUP[state.supporter] || '—'}${s1?.medication === 'yes' ? ' · taking medication for mental health' : ''}</dd>
      ${s1?.problem ? html`<dt>Main difficulty (own words)</dt><dd>${s1.problem}</dd>` : ''}
      ${s1?.duration ? html`<dt>Duration</dt><dd>${s1.duration}</dd>` : ''}
      ${s1?.triage ? html`<dt>Recommended support at assessment</dt><dd>${s1.triage.title}<ul class="small" style="margin:4px 0 0">${(s1.triage.reasons || []).map((r) => html`<li>${r}</li>`)}</ul></dd>` : ''}
    </dl>

    <h2>Risk</h2>
    ${risk.length ? html`<div class="callout crisis"><ul style="margin:0">${risk.map((r) => html`<li>${fmtDate(r.at)}: ${r.what}</li>`)}</ul></div>` : html`<p>No self-harm thoughts reported on the PHQ-9 item 9 or the weekly safety question, and nothing ticked on the suitability screen.</p>`}

    <h2>Measures</h2>
    ${measures.length ? html`<div class="table-wrap"><table class="data"><thead><tr><th>Measure</th><th>Scores (oldest → newest)</th><th>First → latest</th><th>Outcome</th></tr></thead><tbody>
      ${measures.map(({ id, a, pts }) => { const o = pts.length > 1 ? outcome(id, pts[0].score, pts.at(-1).score) : null; const u = a.percent ? '%' : ''; return html`<tr><td>${a.name}${a.validated ? '' : html`<br><span class="small faint">original, unvalidated</span>`}</td>
        <td class="small">${pts.map((p) => `${p.score}${u}`).join(' → ')}</td><td>${pts[0].score}${u} → ${pts.at(-1).score}${u}</td><td>${o ? o.label : 'One score so far'}</td></tr>`; })}</tbody></table></div>
      <div data-chart style="margin-top:12px"></div>
      <p class="small faint">Reliable change: PHQ-9 ≥ 6 points, GAD-7 ≥ 4 points; caseness PHQ-9 ≥ 10, GAD-7 ≥ 8; recovery = moving from caseness to below it, with reliable improvement (NHS Talking Therapies manual). Area check-ins and the life impact check are original questions and not validated.</p>` : html`<p>No questionnaires completed yet.</p>`}

    ${map ? html`<h2>CBT map (case formulation)</h2><dl class="kv">
      <dt>Situation</dt><dd>${map.situation || '—'}</dd><dt>Thoughts</dt><dd>${map.thought || '—'}</dd>
      <dt>Feelings</dt><dd>${(map.emotions || []).map((e) => `${e.name} ${e.v}%`).join(', ') || '—'}</dd><dt>Body</dt><dd>${(map.body || []).join(', ') || '—'}</dd>
      <dt>Behaviour</dt><dd>${map.behaviour || '—'}</dd>
      <dt>Maintaining factors</dt><dd>${ms.map((x) => x.label).join('; ') || '—'}${map.shortTerm ? html`<br><span class="small">Short term: ${map.shortTerm}</span>` : ''}${map.longTerm ? html`<br><span class="small">Long term: ${map.longTerm}</span>` : ''}</dd>
      ${(map.triggers || []).length ? html`<dt>Triggers</dt><dd>${map.triggers.join(', ')}</dd>` : ''}
      ${map.meaning || (map.beliefs || []).length || map.rule ? html`<dt>Beliefs</dt><dd>${[map.meaning, (map.beliefs || []).join('; '), map.rule && `Rule: ${map.rule}`].filter(Boolean).join(' · ')}</dd>` : ''}
      ${(map.strengths || []).length || map.resources ? html`<dt>Strengths and resources</dt><dd>${[(map.strengths || []).join(', '), map.resources].filter(Boolean).join(' · ')}</dd>` : ''}
    </dl>` : ''}

    ${goals.length ? html`<h2>Goals</h2><div class="table-wrap"><table class="data"><thead><tr><th>Goal</th><th>How they’ll know</th><th>Ratings (0–10)</th></tr></thead><tbody>
      ${goals.map((g) => html`<tr><td>${g.text}</td><td>${g.how || '—'}</td><td>${g.ratings.map((r) => r.v).join(' → ')}</td></tr>`)}</tbody></table></div>` : ''}

    <h2>Sessions</h2>
    <div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>Date</th><th>Topic</th><th>Practice set</th><th>Helpful</th><th>Main takeaway</th></tr></thead><tbody>
      ${sessions.map(({ n, plan, rec }) => { const nxt = state.sessions?.[n + 1] ? sessionRecord(records, state, n + 1) : null; return html`<tr><td>${n}</td><td>${fmtDate(rec.createdAt, { day: 'numeric', month: 'short' })}</td><td>${plan.title}</td>
        <td class="small">${(n === 1 || n === 2 ? [{ ex: c.monitoring.ex, perWeek: c.monitoring.perWeek }] : rec.data?.homework || []).filter((h) => h && EXERCISE_BY_ID[h.ex]).map((h) => `${exTitle(h.ex)} ×${h.perWeek}`).join(', ') || '—'}${nxt?.metrics?.adherence != null ? html`<br><span class="faint">done before next session: ${pct(nxt.metrics.adherence)}</span>` : ''}</td>
        <td>${rec.metrics?.helpful != null ? `${rec.metrics.helpful}/10` : '—'}</td><td class="small">${rec.data?.takeaway || rec.data?.problem || '—'}</td></tr>`; })}</tbody></table></div>

    ${end ? html`<h2>Staying-well plan</h2><dl class="kv">
      <dt>What they learned</dt><dd>${end.learnedAll || '—'}</dd><dt>Most helpful skills</dt><dd>${(end.helped || []).join(', ') || '—'}</dd>
      <dt>Early warning signs</dt><dd>${(end.signs || []).join(', ') || '—'}</dd><dt>Plan if they appear</dt><dd>${end.plan || '—'}</dd>
      ${end.people ? html`<dt>People who can help</dt><dd>${end.people}</dd>` : ''}${end.setback ? html`<dt>If there is a setback</dt><dd>${end.setback}</dd>` : ''}
    </dl>` : ''}
    <p class="small faint section">Measures: PHQ-9 and GAD-7 © Pfizer (no permission required to reproduce). Generated on the person’s own device by CBT Toolkit; no data was sent to any server.</p>
  </div>`;
  const mount = (root) => {
    const offs = [on(root, 'click', '[data-print]', () => window.print())];
    const el = root.querySelector('[data-chart]');
    const pm = measures.find((m) => m.id === c.primary) || measures[0];
    if (el && pm) offs.push(lineChart(el, { caption: `${pm.a.name} during the course`, yMin: 0, yMax: pm.a.max, bands: pm.a.chartBands, height: 200, format: (v) => `${fmtNum(v)}${pm.a.percent ? '%' : ''}`,
      series: [{ name: pm.a.name, color: 'var(--s1)', points: pm.pts.map((p) => ({ x: p.at, y: p.score })) }] }));
    return () => offs.forEach((f) => f && f());
  };
  return { title: 'Clinician summary', body, mount };
}

