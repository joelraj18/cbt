// "Skill of the day": a rotating micro-lesson built from the site's own content
// (thinking traps, myths vs facts, key facts, glossary, evidence points). Deterministic by date.
import { THINKING_TRAPS, GLOSSARY, EVIDENCE_POINTS } from './learn.js';
import { AREAS } from './areas.js';

function build() {
  const traps = THINKING_TRAPS.map((t) => ({ kind: 'Thinking trap', title: t.name, text: `${t.simple} For example: ${t.example}`, tip: `Ask yourself: ${t.question}`, href: '#/learn?s=traps' }));
  const myths = AREAS.flatMap((a) => a.myths.map((m) => ({ kind: 'Myth vs fact', title: `“${m.myth}”`, text: m.fact, ref: m.ref, href: `#/area/${a.id}`, area: a.id })));
  const facts = AREAS.flatMap((a) => a.facts.map((f) => ({ kind: 'Did you know?', title: a.name, text: f.text, ref: f.ref, href: `#/area/${a.id}`, area: a.id })));
  const words = GLOSSARY.map((g) => ({ kind: 'CBT word of the day', title: g.term, text: g.def, href: '#/learn?s=glossary' }));
  const evidence = EVIDENCE_POINTS.map((p) => ({ kind: 'Why CBT works', title: p.title, text: p.text, ref: p.refs[0], href: '#/learn?s=evidence' }));
  // interleave categories so consecutive days feel different
  const lists = [traps, myths, facts, words, evidence];
  const out = [];
  for (let i = 0; out.length < lists.reduce((s, l) => s + l.length, 0); i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

export const SKILLS = build();

export function skillForDate(date = new Date()) {
  const d = new Date(date);
  const dayIndex = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return SKILLS[((dayIndex % SKILLS.length) + SKILLS.length) % SKILLS.length];
}
