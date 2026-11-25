import { html, raw, on, toast, debounce } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { perf } from '../core/perf.js';
import { fmtMs } from '../core/format.js';
import { research } from '../data/research.js';
import { AREAS, AREA_BY_ID, areaColor } from '../data/areas.js';
import { EXERCISES } from '../data/exercises/index.js';
import { ASSESSMENTS } from '../data/assessments.js';
import { EVIDENCE_POINTS } from '../data/learn.js';
import { pageHead, refCard, refLinks, shortCite, fullCitation, isSynthesis, REF_BY_ID, areaChip, adSlot, areaStyle } from '../ui/components.js';
import { getEngine } from '../lib/search-index.js';

const TYPES = [['synthesis', 'Meta-analyses & reviews', isSynthesis], ['trial', 'Randomised trials', (r) => /random|trial|RCT/i.test(r.type) && !isSynthesis(r)], ['other', 'Other studies, theory & books', (r) => !isSynthesis(r) && !/random|trial|RCT/i.test(r.type)]];

export async function researchListView({ query }) {
  const withDoi = research.filter((r) => r.doi).length, withPm = research.filter((r) => r.pmid).length;
  const body = html`<div class="container">${pageHead({ title: 'Research library', lede: `The ${research.length} studies, reviews, guidelines and books behind every exercise — each with a plain-language summary and links to the original.` })}
    <div class="stats" style="margin-bottom:18px">
      <div class="stat"><div class="label">References</div><div class="value">${research.length}</div></div>
      <div class="stat"><div class="label">DOI-verified via Crossref</div><div class="value">${withDoi}</div></div>
      <div class="stat"><div class="label">Checked against PubMed abstract</div><div class="value">${withPm}</div></div>
      <div class="stat"><div class="label">Meta-analyses & reviews</div><div class="value">${research.filter(isSynthesis).length}</div></div>
    </div>
    <div class="card flat" style="margin-bottom:16px">
      <div class="search-box">${icon('search')}<input type="search" data-q placeholder="Search research: e.g. exposure, habit, sleep, Cuijpers, meta-analysis" value="${query.q || ''}" aria-label="Search research"></div>
      <div class="options" style="margin-top:12px" role="group" aria-label="Filter by area"><button class="chip" data-area="" aria-pressed="${!query.area}">All areas</button><button class="chip" data-area="general" aria-pressed="${query.area === 'general'}">How CBT works</button>${AREAS.map((a) => html`<button class="chip" data-area="${a.id}" aria-pressed="${query.area === a.id}" ${areaStyle(a.id)}><span class="area-dot"></span>${a.name}</button>`)}</div>
      <div class="cluster" style="margin-top:12px"><select data-type style="width:auto" aria-label="Study type"><option value="">All study types</option>${TYPES.map(([v, l]) => html`<option value="${v}">${l}</option>`)}</select>
        <select data-sort style="width:auto" aria-label="Sort"><option value="relevance">Sort: relevance / newest</option><option value="new">Newest first</option><option value="old">Oldest first</option><option value="az">Title A–Z</option></select>
        <span class="search-stats" data-stats style="margin:0"></span></div>
    </div>
    <div data-list class="grid" style="--min:340px"></div>
    <div style="text-align:center;margin-top:16px"><button class="btn" data-more hidden>Show more</button></div>
    <section class="section"><h2>Why CBT? The big picture</h2><div class="grid" style="--min:300px">${EVIDENCE_POINTS.map((p) => html`<div class="card flat"><h3>${p.title}</h3><p class="small">${p.text}</p><p class="small" style="margin:0">${p.refs.map((r, i) => html`${i ? ' · ' : ''}<a href="#/research/${r}">${shortCite(REF_BY_ID[r])}</a>`)}</p></div>`)}</div></section>
    ${adSlot('banner')}</div>`;

  const mount = (root) => {
    let area = query.area || '', limit = 30;
    const draw = () => {
      const q = root.querySelector('[data-q]').value.trim(), type = root.querySelector('[data-type]').value, sort = root.querySelector('[data-sort]').value;
      const t0 = perf.now();
      let list, searchMs = null;
      if (q) { const res = getEngine().search(q, { kind: 'research', limit: 500 }); list = res.results.map((r) => REF_BY_ID[r.doc.id.slice(4)]).filter(Boolean); searchMs = res.ms; }
      else list = research.slice();
      if (area) list = list.filter((r) => r.areas.includes(area));
      if (type) list = list.filter(TYPES.find((t) => t[0] === type)[2]);
      if (sort === 'new' || (sort === 'relevance' && !q)) list.sort((a, b) => b.year - a.year);
      if (sort === 'old') list.sort((a, b) => a.year - b.year);
      if (sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title));
      const ms = perf.now() - t0;
      root.querySelector('[data-stats]').textContent = `${list.length} of ${research.length} references · filtered in ${fmtMs(ms)}${searchMs != null ? ` (search ${fmtMs(searchMs)})` : ''}`;
      root.querySelector('[data-list]').innerHTML = list.length ? String(html`${list.slice(0, limit).map((r) => refCard(r))}`) : '<p class="muted">No references match. Try another word or filter.</p>';
      root.querySelector('[data-more]').hidden = list.length <= limit;
    };
    const offs = [
      on(root, 'input', '[data-q]', debounce(() => { limit = 30; draw(); }, 120)),
      on(root, 'change', 'select', () => { limit = 30; draw(); }),
      on(root, 'click', '[data-area]', (e, b) => { area = b.dataset.area; root.querySelectorAll('[data-area]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); limit = 30; draw(); }),
      on(root, 'click', '[data-more]', () => { limit += 30; draw(); }),
    ];
    draw();
    return () => offs.forEach((f) => f());
  };
  return { title: 'Research library', body, mount };
}

export async function researchDetailView({ params }) {
  const r = REF_BY_ID[params.id];
  if (!r) return { title: 'Not found', body: html`<div class="container"><p>Reference not found. <a href="#/research">Research library</a></p></div>` };
  const usedEx = EXERCISES.filter((e) => e.refs.includes(r.id));
  const usedAreas = AREAS.filter((a) => [...a.facts, ...a.myths].some((f) => f.ref === r.id) || a.definitionRef === r.id);
  const usedAs = ASSESSMENTS.filter((a) => a.refs.includes(r.id));
  const related = research.filter((x) => x.id !== r.id && x.areas.some((a) => r.areas.includes(a))).sort((a, b) => Math.abs(a.year - r.year) - Math.abs(b.year - r.year)).slice(0, 4);
  const body = html`<div class="container narrow">${pageHead({ crumbs: [{ label: 'Research', href: '#/research' }, { label: shortCite(r) }], title: r.title })}
    <div class="meta" style="margin:-8px 0 18px"><span class="badge ${isSynthesis(r) ? 'ev-A' : ''}">${r.type}</span><span>${(r.authors || []).join(', ')}</span><span>${r.year}</span><span>${r.journal || r.publisher}${r.volume ? ` ${r.volume}` : ''}${r.issue ? `(${r.issue})` : ''}${r.pages ? `: ${r.pages}` : ''}</span></div>
    <div class="callout simple"><div class="callout-title">${icon('info')} In simple words</div><p style="margin:0">${r.simple}</p></div>
    <section class="section"><h2>Key findings</h2><p>${r.finding}</p>
      <dl class="kv">${r.n && r.n !== '—' ? html`<dt>Sample</dt><dd>${r.n}</dd>` : ''}${r.effect ? html`<dt>Key result</dt><dd><span class="effect">${r.effect}</span></dd>` : ''}<dt>Study type</dt><dd>${r.type}</dd><dt>Areas</dt><dd class="cluster" style="--gap:6px">${r.areas.map((a) => (a === 'general' ? html`<span class="badge">How CBT works</span>` : areaChip(a)))}</dd>
      <dt>Verification</dt><dd><span class="verified">${icon('check', 'icon')} ${r.verified}</span>${r.doi ? html` · DOI <code>${r.doi}</code>` : ''}${r.pmid ? html` · PMID <code>${r.pmid}</code>` : ''}</dd></dl>
      <p style="margin-top:14px">${refLinks(r)}</p></section>
    <section class="section card flat"><h3>Cite this</h3><p class="small" data-cite style="font-family:var(--mono)">${fullCitation(r)}</p><button class="btn small" data-copy>${icon('clipboard')} Copy citation</button></section>
    ${usedEx.length || usedAreas.length || usedAs.length ? html`<section class="section"><h2>Used on this site</h2><ul>${usedEx.map((e) => html`<li><a href="#/exercise/${e.id}">${e.title}</a> (exercise)</li>`)}${usedAreas.map((a) => html`<li><a href="#/area/${a.id}">${a.name}</a> (area facts)</li>`)}${usedAs.map((a) => html`<li><a href="#/check-in/${a.id}">${a.title}</a> (questionnaire)</li>`)}</ul></section>` : ''}
    <section class="section"><h2>Related research</h2><div class="stack">${related.map((x) => refCard(x, { compact: true }))}</div></section>
    <p class="small faint">Summaries are written in plain language by CBT Toolkit; please read the original paper for full methods, limitations and context.</p></div>`;
  return { title: shortCite(r), body, mount: (root) => on(root, 'click', '[data-copy]', async () => { try { await navigator.clipboard.writeText(fullCitation(r)); toast('Citation copied.'); } catch { toast('Copy failed — select the text instead.'); } }) };
}
