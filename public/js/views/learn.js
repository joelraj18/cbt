import { html, raw } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { CBT_GUIDE, MISTAKE_CYCLE, THINKING_TRAPS, GLOSSARY, FAQ, EVIDENCE_POINTS } from '../data/learn.js';
import { AREAS, LEVELS } from '../data/areas.js';
import { pageHead, adSlot, levelBadge, shortCite, REF_BY_ID } from '../ui/components.js';
import { cycleBlock, mountCycles } from '../ui/cycle.js';

export async function learnView({ query }) {
  const cycles = [MISTAKE_CYCLE, ...AREAS.map((a) => ({ id: a.id, name: a.short, ...a.cycle }))];
  const section = (g) => html`<section class="section" id="s-${g.id}"><h2>${g.title}</h2>${g.body.map((p) => (p.trim().startsWith('<') ? raw(p) : html`<p>${raw(p)}</p>`))}</section>`;
  const [what, idea, ...rest] = CBT_GUIDE;
  const body = html`<div class="container narrow">
    ${pageHead({ title: 'What is CBT? A plain-language guide', lede: 'A practical, down-to-earth explanation of Cognitive Behavioural Therapy — with everyday examples — so you can decide whether it is right for you.' })}
    <nav class="card flat small" aria-label="On this page"><strong>On this page:</strong> ${CBT_GUIDE.map((g, i) => html`${i ? ' · ' : ''}<a href="#/learn?s=${g.id}">${g.title}</a>`)} · <a href="#/learn?s=traps">Thinking traps</a> · <a href="#/learn?s=evidence">The evidence</a> · <a href="#/learn?s=glossary">Glossary</a> · <a href="#/learn?s=faq">FAQ</a></nav>
    ${section(what)}
    ${section(idea)}
    <div style="margin:8px 0 12px">${cycleBlock(cycles, { id: 'learn', intro: 'Choose an example. Click any box to highlight it, then switch to <strong>Breaking it with CBT</strong> to see how a different thought or action changes everything that follows.' })}</div>
    ${rest.slice(0, 2).map(section)}
    ${adSlot('inArticle')}
    ${rest.slice(2).map(section)}

    <section class="section" id="s-traps"><h2>The 12 thinking traps</h2><p class="muted">Everyone falls into these sometimes — especially when stressed or low. Naming them makes them easier to question. <a href="#/exercise/thinking-traps">Take the quiz →</a></p>
      <div class="grid" style="--min:260px">${THINKING_TRAPS.map((t) => html`<div class="card flat"><h3 style="font-size:1rem">${t.name}</h3><p class="small" style="margin:0 0 6px">${t.simple}</p><p class="small muted" style="margin:0 0 6px"><em>${t.example}</em></p><p class="small" style="margin:0"><strong>Ask yourself:</strong> ${t.question}</p></div>`)}</div></section>

    <section class="section" id="s-evidence"><h2>The evidence, in brief</h2>
      <div class="stack">${EVIDENCE_POINTS.map((p) => html`<div class="card flat"><h3>${p.title}</h3><p class="small">${p.text}</p><p class="small" style="margin:0">${p.refs.map((r, i) => html`${i ? ' · ' : ''}<a href="#/research/${r}">${shortCite(REF_BY_ID[r])}</a>`)}</p></div>`)}</div>
      <h3 style="margin-top:20px">How we grade each exercise</h3><div class="stack" style="--gap:8px">${Object.entries(LEVELS).map(([k, v]) => html`<div class="cluster" style="--gap:10px">${levelBadge(k)}<span class="small muted">${v.desc}</span></div>`)}</div></section>

    <section class="section" id="s-glossary"><h2>Glossary</h2><dl class="kv">${GLOSSARY.slice().sort((a, b) => a.term.localeCompare(b.term)).map((g) => html`<dt>${g.term}</dt><dd>${g.def}</dd>`)}</dl></section>

    <section class="section" id="s-faq"><h2>Frequently asked questions</h2><div class="stack">${FAQ.map((f) => html`<details class="more"><summary>${f.q}</summary><p style="margin:0">${f.a}</p></details>`)}</div></section>

    <div class="callout info section"><div class="callout-title">${icon('play')} Ready to try it?</div><p style="margin:0 0 10px">Start with a quick check-in, then pick the area that matters most to you.</p><div class="cluster"><a class="btn primary" href="#/check-in">Take a check-in</a><a class="btn" href="#/areas">Choose an area</a></div></div>
  </div>`;
  return {
    title: 'What is CBT?', body,
    mount(root) {
      const stop = mountCycles(root, { learn: cycles });
      if (query.s) setTimeout(() => root.querySelector(`#s-${query.s}`)?.scrollIntoView({ block: 'start' }), 30);
      return stop;
    },
  };
}
