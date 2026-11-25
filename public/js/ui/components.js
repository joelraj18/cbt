// Shared UI building blocks (return SafeHTML via html``).
import { html, raw, esc } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { AREA_BY_ID, LEVELS, areaColor } from '../data/areas.js';
import { research } from '../data/research.js';
import { ADS } from '../config.js';

export const REF_BY_ID = Object.fromEntries(research.map((r) => [r.id, r]));

export const areaStyle = (areaId) => raw(`style="--area:${areaColor(areaId)}"`);

export function levelBadge(level, withName = true) {
  const L = LEVELS[level];
  return html`<span class="badge ev-${level}" title="${L.name}: ${L.desc}"><span class="dot" aria-hidden="true"></span>${withName ? `${level} · ${L.name}` : level}</span>`;
}

export function areaChip(areaId) {
  const a = AREA_BY_ID[areaId];
  if (!a) return '';
  return html`<a class="badge" href="#/area/${a.id}" ${areaStyle(a.id)}><span class="area-dot"></span>${a.name}</a>`;
}

/** "Cuijpers et al., 2023" */
export function shortCite(r) {
  if (!r) return '';
  const a = r.authors || [];
  const isPerson = (s) => /\s[A-Z]{1,4}$/.test(String(s));
  const fam = (s) => (isPerson(s) ? String(s).replace(/\s[A-Z]{1,4}$/, '') : String(s));
  if (a.length === 1 && !isPerson(a[0])) return `${r.publisher && r.publisher.length < a[0].length ? r.publisher : a[0]}, ${r.year}`;
  const who = a.length === 0 ? '' : a.length === 1 ? fam(a[0]) : a.length === 2 ? `${fam(a[0])} & ${fam(a[1])}` : `${fam(a[0])} et al.`;
  return `${who}, ${r.year}`;
}

/** Inline citation link: (Cuijpers et al., 2023) */
export function cite(id) {
  const r = REF_BY_ID[id];
  if (!r) return '';
  return html`<a class="cite" href="#/research/${id}" title="${r.title}">(${shortCite(r)})</a>`;
}

export function fullCitation(r) {
  const authors = (r.authors || []).length > 6 ? r.authors.slice(0, 6).join(', ') + ', et al.' : (r.authors || []).join(', ');
  const src = r.journal ? `${r.journal}${r.volume ? `, ${r.volume}` : ''}${r.issue ? `(${r.issue})` : ''}${r.pages ? `, ${r.pages}` : ''}` : r.publisher || '';
  return `${authors} (${r.year}). ${r.title}. ${src}.${r.doi ? ` https://doi.org/${r.doi}` : r.url ? ` ${r.url}` : ''}`;
}

export function refLinks(r) {
  return html`<span class="cluster" style="--gap:10px">
    ${r.doi ? html`<a href="https://doi.org/${r.doi}" target="_blank" rel="noopener">${icon('external', 'icon')} DOI</a>` : ''}
    ${r.pmid ? html`<a href="https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/" target="_blank" rel="noopener">PubMed</a>` : ''}
    ${r.url ? html`<a href="${r.url}" target="_blank" rel="noopener">${icon('external', 'icon')} Source</a>` : ''}
    <a href="https://scholar.google.com/scholar?q=${encodeURIComponent(r.title)}" target="_blank" rel="noopener">Google Scholar</a>
  </span>`;
}

const SYNTH = /meta|review|guideline|umbrella|cochrane/i;
export const isSynthesis = (r) => SYNTH.test(r.type);

export function refCard(r, { compact = false } = {}) {
  if (!r) return '';
  return html`<article class="card flat ref-card">
    <div class="split" style="align-items:flex-start"><div class="cluster" style="--gap:6px">
      <span class="badge ${isSynthesis(r) ? 'ev-A' : /random|trial/i.test(r.type) ? 'ev-B' : 'type'}">${r.type}</span>
      ${r.effect ? html`<span class="effect" title="Key result">${r.effect}</span>` : ''}
    </div><span class="verified" title="Metadata verified against: ${r.verified}">${icon('check', 'icon')} ${r.doi ? 'DOI verified' : 'Verified source'}</span></div>
    <h3 style="margin-top:8px"><a href="#/research/${r.id}">${r.title}</a></h3>
    <div class="ref-meta">${shortCite(r)} · ${r.journal || r.publisher || ''}${r.n && r.n !== '—' ? html` · <strong>${r.n}</strong>` : ''}</div>
    <p class="ref-simple">${r.simple}</p>
    ${compact ? '' : html`<p class="ref-finding muted small">${r.finding}</p>`}
    <div class="small" style="margin-top:8px">${refLinks(r)}</div>
  </article>`;
}

export function exerciseCard(ex, { stats } = {}) {
  return html`<a class="card card-link" href="#/exercise/${ex.id}" ${areaStyle(ex.area)}>
    <div class="cluster" style="--gap:6px;margin-bottom:8px">${levelBadge(ex.level)}<span class="badge">${ex.minutes} min</span>${ex.widget ? html`<span class="badge">Interactive</span>` : ''}</div>
    <h3>${ex.title}</h3>
    <p class="muted small" style="margin:0">${ex.tagline}</p>
    ${stats ? html`<div class="meta" style="margin-top:10px">${stats}</div>` : ''}
  </a>`;
}

export function pageHead({ crumbs = [], title, lede, actions, area }) {
  return html`<div class="page-head" ${area ? areaStyle(area) : ''}>
    ${crumbs.length ? html`<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => html`${i ? ' / ' : ''}${c.href ? html`<a href="${c.href}">${c.label}</a>` : c.label}`)}</nav>` : ''}
    <div class="split" style="align-items:flex-end"><div><h1>${title}</h1>${lede ? html`<p class="lede">${lede}</p>` : ''}</div>${actions || ''}</div>
  </div>`;
}

export function crisisCallout(extra = '') {
  return html`<div class="callout crisis" role="alert"><div class="callout-title">${icon('phone')} If you are thinking about suicide or self-harm, please reach out now</div>
    <p>You deserve support right away. In the US or Canada call or text <strong>988</strong>; in the UK or Ireland call Samaritans on <strong>116 123</strong>; in Australia call Lifeline on <strong>13 11 14</strong>. If you are in immediate danger, call your local emergency number (911, 999, 112 or 000).</p>
    <p style="margin:0"><a class="btn small danger" href="#/help">${icon('phone')} All crisis lines &amp; help</a> ${extra}</p></div>`;
}

export function disclaimer() {
  return html`<p class="small faint">CBT Toolkit is an educational self-help resource based on published research. It is not a diagnosis or a substitute for professional care.</p>`;
}

/** Reserved advertising space. Real ad units are filled by lib/ads.js after consent. */
export function adSlot(kind = 'banner') {
  if (!ADS.enabled) return '';
  const configured = ADS.client && ADS.slots[kind];
  if (!configured && !ADS.showPlaceholders) return '';
  return html`<aside class="ad-slot ${configured ? '' : 'placeholder'} no-print" data-kind="${kind}" aria-label="Advertisement">
    <div class="ad-label">Advertisement</div>
    <div class="ad-box">${configured ? raw(`<ins class="adsbygoogle" data-ad-client="${esc(ADS.client)}" data-ad-slot="${esc(ADS.slots[kind])}" data-ad-format="${kind === 'inArticle' ? 'fluid' : 'auto'}" ${kind === 'inArticle' ? 'data-ad-layout="in-article"' : ''} data-full-width-responsive="true"></ins>`) : html`<span>Ad space reserved (${kind}) — add your AdSense IDs in <code>js/config.js</code></span>`}</div>
  </aside>`;
}

export function statTile(label, value, sub = '') {
  return html`<div class="stat"><div class="label">${label}</div><div class="value">${value}</div>${sub ? html`<div class="delta">${sub}</div>` : ''}</div>`;
}

export function emptyState(title, body, cta) {
  return html`<div class="empty"><h3>${title}</h3><p>${body}</p>${cta || ''}</div>`;
}

/** Segments [{t, m}] from the search engine → highlighted HTML. */
export const segs = (arr) => raw((arr || []).map((s) => (s.m ? `<mark>${esc(s.t)}</mark>` : esc(s.t))).join(''));
