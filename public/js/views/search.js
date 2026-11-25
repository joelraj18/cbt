import { html, raw, on, debounce } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { perf } from '../core/perf.js';
import { fmtMs, fmtNum } from '../core/format.js';
import { go } from '../core/router.js';
import { AREAS, AREA_BY_ID, areaColor } from '../data/areas.js';
import { getEngine, buildPersonalIndex } from '../lib/search-index.js';
import { pageHead, segs, adSlot } from '../ui/components.js';
import { describeRecord } from '../ui/records.js';

const KINDS = [['', 'Everything'], ['exercise', 'Exercises'], ['research', 'Research'], ['area', 'Areas'], ['learn', 'Learn'], ['check-in', 'Check-ins'], ['page', 'Pages']];
const KIND_LABEL = Object.fromEntries(KINDS);

export async function searchView({ query }) {
  const q = query.q || '';
  const body = html`<div class="container">${pageHead({ title: 'Search', lede: 'Instant full-text search across every exercise, study, guide and questionnaire — running entirely in your browser.' })}
    <form data-form><div class="search-box">${icon('search')}<input type="search" name="q" value="${q}" placeholder="Try: can't stop worrying · procrastination · habits · libido · anger" aria-label="Search" autofocus autocomplete="off"></div></form>
    <div class="cluster" style="margin-top:12px"><div class="options" role="group" aria-label="Filter by type" data-kinds></div>
      <label class="check" style="padding:0;margin-left:auto"><input type="checkbox" data-mine ${query.mine ? raw('checked') : ''}><span class="small">Also search my own entries (on-device)</span></label></div>
    <div class="options" style="margin-top:8px" data-areas role="group" aria-label="Filter by area"></div>
    <div class="search-stats" data-stats aria-live="polite"></div>
    <div data-results></div>
    <div data-mine-results></div>
    ${adSlot('banner')}
    <details class="more" style="margin-top:24px"><summary>How this search works</summary><p class="small">A custom search engine built into the page: it indexes ${fmtNum(getEngine().stats.docs)} documents (${fmtNum(getEngine().stats.terms)} unique word stems) when the site loads, ranks results with BM25F (title and tags count more than body text), understands word endings ("worrying" → "worry"), everyday synonyms ("libido" → sexual desire, "lazy" → procrastination), UK/US spellings, typos ("procrastinaton") and "exact phrases" in quotes. No query ever leaves your device, so it works offline and on any static host.</p></details>
  </div>`;

  const mount = (root) => {
    const input = root.querySelector('input[name=q]');
    let kind = query.kind || '', area = query.area || '', personal = null;
    const draw = () => {
      const text = input.value.trim();
      const eng = getEngine();
      if (!text) { root.querySelector('[data-results]').innerHTML = '<p class="muted">Type something to search.</p>'; root.querySelector('[data-stats]').textContent = `${fmtNum(eng.stats.docs)} documents ready to search`; root.querySelector('[data-kinds]').innerHTML = ''; root.querySelector('[data-areas]').innerHTML = ''; root.querySelector('[data-mine-results]').innerHTML = ''; return; }
      const res = eng.search(text, { kind: kind || null, area: area || null, limit: 40 });
      perf.counters.searches++;
      perf.event(`Searched "${text.slice(0, 40)}"`, res.ms, `${res.total} results`);
      const total = Object.values(res.facets.kind).reduce((a, b) => a + b, 0);
      root.querySelector('[data-kinds]').innerHTML = String(html`${KINDS.map(([k, l]) => { const c = k ? res.facets.kind[k] || 0 : total; return c || !k ? html`<button class="chip" data-kind="${k}" aria-pressed="${kind === k}">${l} <span class="faint">${c}</span></button>` : ''; })}`);
      root.querySelector('[data-areas]').innerHTML = String(html`${Object.keys(res.facets.area).length ? html`<button class="chip" data-area="" aria-pressed="${!area}">All areas</button>${AREAS.filter((a) => res.facets.area[a.id]).map((a) => html`<button class="chip" data-area="${a.id}" aria-pressed="${area === a.id}" style="--area:${areaColor(a.id)}"><span class="area-dot"></span>${a.name} <span class="faint">${res.facets.area[a.id]}</span></button>`)}` : ''}`);
      root.querySelector('[data-stats]').innerHTML = String(html`<span><strong>${fmtNum(res.total)}</strong> results in <strong>${fmtMs(res.ms)}</strong></span><span>${fmtNum(eng.stats.docs)} documents · ${fmtNum(eng.stats.terms)} terms</span><span>expanded to ${res.expanded.length} term${res.expanded.length === 1 ? '' : 's'}</span>${res.didYouMean ? html`<span>Did you mean <a href="#/search?q=${encodeURIComponent(res.didYouMean)}">${res.didYouMean}</a>?</span>` : ''}`);
      root.querySelector('[data-results]').innerHTML = res.results.length ? String(html`${res.results.map((r) => html`<div class="result"><div class="small faint">${KIND_LABEL[r.doc.kind] || r.doc.kind}${r.doc.area ? html` · <span class="area-dot" style="--area:${areaColor(r.doc.area)}"></span> ${AREA_BY_ID[r.doc.area]?.name}` : ''}</div>
        <a class="title" href="${r.doc.url}">${segs(r.titleSegs)}</a><div class="snippet">${segs(r.snippet)}</div></div>`)}`) : String(html`<div class="empty"><h3>No results</h3><p>Try a simpler word, or browse <a href="#/areas">areas</a> and the <a href="#/research">research library</a>.</p></div>`);
      const mineBox = root.querySelector('[data-mine-results]');
      if (root.querySelector('[data-mine]').checked) {
        personal = personal || buildPersonalIndex(store.all(), describeRecord);
        const mine = personal.search(text, { limit: 20 });
        mineBox.innerHTML = String(html`<section class="section"><h2 style="font-size:1.2rem">${icon('lock')} In your entries <span class="small faint">${mine.total} found in ${fmtMs(mine.ms)} — on this device only</span></h2>
          ${mine.results.map((r) => html`<div class="result"><a class="title" href="${r.doc.url}">${segs(r.titleSegs)}</a><div class="snippet">${segs(r.snippet)}</div></div>`)}</section>`);
      } else mineBox.innerHTML = '';
    };
    const offs = [
      on(root, 'input', 'input[name=q]', debounce(() => { draw(); history.replaceState(null, '', `#/search?q=${encodeURIComponent(input.value)}`); }, 90)),
      on(root, 'submit', '[data-form]', (e) => { e.preventDefault(); draw(); }),
      on(root, 'click', '[data-kind]', (e, b) => { kind = b.dataset.kind; draw(); }),
      on(root, 'click', '[data-area]', (e, b) => { area = b.dataset.area; draw(); }),
      on(root, 'change', '[data-mine]', draw),
    ];
    draw();
    input.focus();
    return () => offs.forEach((f) => f());
  };
  return { title: q ? `Search: ${q}` : 'Search', body, mount };
}
