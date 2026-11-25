// Builds the site-wide search index from all content (and, on request, the user's own entries).
import { SearchEngine } from './search.js';
import { perf } from '../core/perf.js';
import { AREAS, AREA_BY_ID, LEVELS } from '../data/areas.js';
import { EXERCISES } from '../data/exercises/index.js';
import { research } from '../data/research.js';
import { ASSESSMENTS } from '../data/assessments.js';
import { CBT_GUIDE, THINKING_TRAPS, GLOSSARY, FAQ } from '../data/learn.js';
import { PROGRAMS } from '../data/programs.js';
import { COURSES } from '../data/courses.js';

export const PAGES = [
  { id: 'home', title: 'Home', url: '#/', summary: 'Start here: check in, choose an area and practise evidence-based CBT exercises.' },
  { id: 'today', title: 'Today — your daily CBT', url: '#/today', summary: 'Daily check-in, personalised practice for today, skill of the day, evening reflection, streaks and daily reminders.' },
  { id: 'course', title: 'CBT course — 8 weekly sessions', url: '#/course', summary: 'Self-guided CBT structured like therapy: assessment with PHQ-9 and GAD-7, your CBT map (formulation) and goals, five skill sessions with homework, and a staying-well plan. Clinician summary to share.' },
  { id: 'standards', title: 'Clinical standards', url: '#/standards', summary: 'How the CBT course follows psychologists’ standards: CBT competences, the Cognitive Therapy Scale, NICE and APA guidelines, stepped care, safety rules and the evidence for self-guided CBT.' },
  { id: 'programs', title: 'Guided programmes', url: '#/programs', summary: 'Day-by-day CBT programmes: 28-day CBT Foundations and 14-day programmes for mood, anxiety, focus, habits, time, intimacy and urges.' },
  { id: 'areas', title: 'All areas', url: '#/areas', summary: 'Depression, anxiety, productivity, self-discipline, time management, sexual desire and impulsiveness.' },
  { id: 'toolbox', title: 'Toolbox — quick tools', url: '#/toolbox', summary: 'Breathing pacer, muscle relaxation, urge surfing timer, focus sprints, grounding and the STOP skill.' },
  { id: 'check-in', title: 'Check-ins & questionnaires', url: '#/check-in', summary: 'PHQ-9 depression, GAD-7 anxiety, WHO-5 wellbeing and area check-ins to measure progress.' },
  { id: 'mood', title: 'Daily mood log', url: '#/mood', summary: 'Log mood, anxiety, energy and sleep in seconds; see your calendar and trends.' },
  { id: 'plan', title: 'My plan', url: '#/plan', summary: 'A personalised weekly practice plan with calendar reminders.' },
  { id: 'journal', title: 'Journal — all my entries', url: '#/journal', summary: 'Browse, search, edit and export everything you have saved.' },
  { id: 'reports', title: 'Progress reports', url: '#/reports', summary: 'Charts, trends, reliable change and personalised insights from your data, with research context. Print or export.' },
  { id: 'research', title: 'Research library', url: '#/research', summary: `${research.length} verified research papers behind every exercise, with plain-language summaries.` },
  { id: 'learn', title: 'What is CBT? A plain-language guide', url: '#/learn', summary: 'How thoughts, feelings, body and behaviour are linked, with everyday examples; thinking traps; glossary; FAQ.' },
  { id: 'help', title: 'Get help now — crisis lines', url: '#/help', summary: 'Crisis lines and emergency numbers, and how to find a CBT therapist.' },
  { id: 'settings', title: 'Settings, backup & privacy', url: '#/settings', summary: 'Theme, text size, encrypted backup, import/export, delete all data, storage usage.' },
  { id: 'privacy', title: 'Privacy policy', url: '#/privacy', summary: 'Your entries never leave your browser. How optional advertising and cookies work.' },
  { id: 'about', title: 'About & methodology', url: '#/about', summary: 'How the toolkit was built, how evidence is graded and how citations were verified.' },
];

let engine = null;

export function buildIndex() {
  if (engine) return engine;
  const t0 = perf.now();
  const e = new SearchEngine();
  PAGES.forEach((p) => e.add({ id: 'page:' + p.id, kind: 'page', title: p.title, summary: p.summary, url: p.url, boost: 1.1 }));
  AREAS.forEach((a) => e.add({ id: 'area:' + a.id, kind: 'area', area: a.id, title: a.name, tags: [a.short, a.tagline], summary: a.simple, url: `#/area/${a.id}`, boost: 1.4,
    body: [...a.signs, ...a.howCbtHelps, a.cycle.title, a.cycle.thought, a.cycle.behaviour, ...a.myths.map((m) => `${m.myth} ${m.fact}`), ...a.facts.map((f) => f.text)].join(' ') }));
  EXERCISES.forEach((x) => e.add({ id: 'ex:' + x.id, kind: 'exercise', area: x.area, areas: [x.area, ...(x.also || [])], title: x.title, url: `#/exercise/${x.id}`, boost: 1.3,
    tags: [x.tagline, LEVELS[x.level].name, ...[x.area, ...(x.also || [])].map((id) => AREA_BY_ID[id]?.name)],
    summary: x.simple, body: [x.why, ...x.steps, ...(x.tips || []), ...(x.pitfalls || []), x.example?.title, ...(x.example?.rows || []).flat(), x.science].join(' ') }));
  research.forEach((r) => e.add({ id: 'ref:' + r.id, kind: 'research', area: r.areas[0] === 'general' ? null : r.areas[0], areas: r.areas, title: r.title, url: `#/research/${r.id}`,
    tags: [r.type, ...r.areas, ...(r.authors || []).slice(0, 3), String(r.year)], summary: r.simple, body: `${r.finding} ${r.journal || r.publisher || ''} ${r.n} ${r.effect}` }));
  ASSESSMENTS.forEach((s) => e.add({ id: 'as:' + s.id, kind: 'check-in', area: s.area === 'general' ? null : s.area, title: s.title, url: `#/check-in/${s.id}`, tags: [s.name], summary: s.intro, body: s.items.join(' '), boost: 1.2 }));
  CBT_GUIDE.forEach((g) => e.add({ id: 'guide:' + g.id, kind: 'learn', title: g.title, url: `#/learn?s=${g.id}`, summary: g.body[0].replace(/<[^>]+>/g, ''), body: g.body.join(' ').replace(/<[^>]+>/g, ' ') }));
  THINKING_TRAPS.forEach((t) => e.add({ id: 'trap:' + t.id, kind: 'learn', title: `Thinking trap: ${t.name}`, url: '#/learn?s=traps', tags: ['thinking trap', 'cognitive distortion'], summary: t.simple, body: `${t.example} ${t.question}` }));
  GLOSSARY.forEach((g) => e.add({ id: 'gl:' + g.term, kind: 'learn', title: g.term, url: '#/learn?s=glossary', tags: ['glossary'], summary: g.def }));
  PROGRAMS.forEach((p) => e.add({ id: 'prog:' + p.id, kind: 'page', area: p.area, title: `Programme: ${p.name} (${p.days} days)`, url: `#/programs/${p.id}`, summary: p.summary, body: p.plan.map((d) => `${d.title} ${d.lesson} ${d.task}`).join(' '), boost: 1.15 }));
  COURSES.forEach((c) => e.add({ id: 'course:' + c.id, kind: 'page', area: c.area, title: `CBT course: ${c.name} (8 sessions)`, url: '#/course', summary: c.summary, tags: ['therapy', 'course', 'sessions'],
    body: [c.basis, ...c.modules.map((m) => `${m.title} ${m.learn} ${m.example}`)].join(' '), boost: 1.2 }));
  FAQ.forEach((f, i) => e.add({ id: 'faq:' + i, kind: 'learn', title: f.q, url: '#/learn?s=faq', tags: ['faq'], summary: f.a }));
  const stats = e.build();
  stats.totalMs = perf.now() - t0;
  engine = e; // store before announcing, so listeners never trigger a second build
  perf.event('Built search index', stats.totalMs, `${stats.docs} documents · ${stats.terms.toLocaleString()} unique terms · ${stats.tokens.toLocaleString()} words`);
  return e;
}

export const getEngine = () => engine || buildIndex();
/** The index if it has been built already (never triggers a build). */
export const builtEngine = () => engine;

/** Separate, temporary index over the user's own saved entries (never persisted, never sent anywhere). */
export function buildPersonalIndex(records, describe) {
  const t0 = perf.now();
  const e = new SearchEngine({ fields: { title: 2.5, tags: 1.5, summary: 1.4, body: 1 } });
  for (const r of records) {
    const d = describe(r);
    e.add({ id: 'rec:' + r.id, kind: 'my-entry', area: r.area, title: d.title, url: d.url, tags: [d.type], summary: d.summary, body: flatten(r.data).join(' ') });
  }
  const stats = e.build();
  perf.event('Indexed your entries (in memory only)', perf.now() - t0, `${stats.docs} entries · ${stats.terms} terms`);
  return e;
}

function flatten(v, out = []) {
  if (v == null) return out;
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => flatten(x, out));
  else if (typeof v === 'object') Object.values(v).forEach((x) => flatten(x, out));
  return out;
}
