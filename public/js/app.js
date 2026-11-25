// CBT Toolkit — application shell and boot sequence.
import { SITE } from './config.js';
import { html, raw, $, on, pref, debounce, esc, toast } from './core/dom.js';
import { icon } from './core/icons.js';
import { perf } from './core/perf.js';
import { store } from './core/store.js';
import { route, startRouter, onRoute, go } from './core/router.js';
import { fmtMs, fmtNum, fmtTime } from './core/format.js';
import { AREAS, areaColor } from './data/areas.js';
import { EXERCISES } from './data/exercises/index.js';
import { research } from './data/research.js';
import { ASSESSMENTS } from './data/assessments.js';
import { buildIndex, getEngine, builtEngine } from './lib/search-index.js';
import { ads } from './lib/ads.js';
import { segs } from './ui/components.js';

import { homeView } from './views/home.js';
import { areasView, areaView } from './views/area.js';
import { exerciseView } from './views/exercise.js';
import { checkinListView, checkinView } from './views/checkin.js';
import { moodView } from './views/mood.js';
import { planView } from './views/plan.js';
import { journalView } from './views/journal.js';
import { reportsView } from './views/reports.js';
import { researchListView, researchDetailView } from './views/research.js';
import { searchView } from './views/search.js';
import { toolboxView } from './views/toolbox.js';
import { learnView } from './views/learn.js';
import { helpView } from './views/help.js';
import { settingsView } from './views/settings.js';
import { privacyView, aboutView, notFoundView } from './views/pages.js';

const NAV = [
  ['#/areas', 'Areas', 'areas'], ['#/toolbox', 'Toolbox', 'toolbox'], ['#/check-in', 'Check-in', 'check-in'],
  ['#/journal', 'Journal', 'journal'], ['#/reports', 'Reports', 'reports'], ['#/research', 'Research', 'research'], ['#/learn', 'Learn CBT', 'learn'],
];

/* ---------------- header / drawer / footer ---------------- */
function renderHeader() {
  $('#site-header').innerHTML = String(html`<div class="container header-row">
    <a class="brand" href="#/" aria-label="${SITE.name} home">${raw(LOGO)}<span>${SITE.name}<small>Evidence-based · private</small></span></a>
    <nav class="main-nav" aria-label="Main">${NAV.map(([h, l, s]) => html`<a href="${h}" data-nav="${s}">${l}</a>`)}</nav>
    <div class="header-actions">
      <button class="search-trigger" type="button" data-open-search aria-label="Search (Ctrl+K)">${icon('search')}<span class="label">Search…</span><kbd>Ctrl K</kbd></button>
      <button class="icon-btn" type="button" data-theme-toggle aria-label="Change theme">${icon(themeIcon())}</button>
      <a class="help-btn" href="#/help">${icon('phone')}<span class="txt">Get help now</span></a>
      <button class="icon-btn menu-btn" type="button" data-open-menu aria-label="Open menu" aria-expanded="false">${icon('menu')}</button>
    </div></div>`);
}

function renderDrawer() {
  const d = document.createElement('div');
  d.className = 'drawer'; d.id = 'drawer';
  d.innerHTML = String(html`<div class="drawer-backdrop" data-close-menu></div><div class="drawer-panel" role="dialog" aria-label="Menu">
    <div class="split"><strong>Menu</strong><button class="icon-btn" data-close-menu aria-label="Close menu">${icon('x')}</button></div>
    <nav aria-label="Mobile">
      <a href="#/">${icon('home')} Home</a>
      ${NAV.map(([h, l, s]) => html`<a href="${h}" data-nav="${s}">${icon({ areas: 'map', toolbox: 'tool', 'check-in': 'clipboard', journal: 'notebook', reports: 'chart', research: 'flask', learn: 'book' }[s])} ${l}</a>`)}
      <a href="#/mood">${icon('smile')} Mood log</a><a href="#/plan">${icon('calendar')} My plan</a><a href="#/settings">${icon('gear')} Settings & backup</a>
      <div class="group-label">Areas</div>
      ${AREAS.map((a) => html`<a href="#/area/${a.id}" style="--area:${areaColor(a.id)}"><span class="area-dot"></span> ${a.name}</a>`)}
    </nav></div>`);
  document.body.append(d);
  on(d, 'click', '[data-close-menu], a', () => toggleMenu(false));
}
function toggleMenu(open) {
  $('#drawer').classList.toggle('open', open);
  $('[data-open-menu]')?.setAttribute('aria-expanded', String(open));
  if (open) $('#drawer a')?.focus();
}

function renderFooter() {
  $('#site-footer').innerHTML = String(html`<div class="container">
    <div class="footer-grid">
      <div><a class="brand" href="#/">${raw(LOGO)}<span>${SITE.name}</span></a>
        <p style="margin-top:10px">Free, private CBT exercises explained in plain language and backed by ${research.length} verified research papers. Everything you enter stays in this browser.</p>
        <p class="small faint">An educational self-help resource, not a diagnosis or a substitute for professional care. In an emergency call your local emergency number.</p></div>
      <div><h4>Areas</h4><ul>${AREAS.map((a) => html`<li><a href="#/area/${a.id}">${a.name}</a></li>`)}</ul></div>
      <div><h4>Your tools</h4><ul><li><a href="#/check-in">Check-ins</a></li><li><a href="#/mood">Mood log</a></li><li><a href="#/plan">My plan</a></li><li><a href="#/journal">Journal</a></li><li><a href="#/reports">Reports</a></li><li><a href="#/toolbox">Toolbox</a></li></ul></div>
      <div><h4>About</h4><ul><li><a href="#/learn">What is CBT?</a></li><li><a href="#/research">Research library</a></li><li><a href="#/about">Methodology</a></li><li><a href="#/privacy">Privacy</a></li><li><a href="#/settings">Settings & backup</a></li><li><a href="#/help">Get help now</a></li></ul></div>
    </div>
    <div class="perf-line" aria-live="polite"><span data-perf="ready">Loading…</span><span data-perf="index"></span><span data-perf="local"></span><span>${icon('lock', 'icon')} 0 bytes of your data sent to any server</span><button type="button" data-open-live>What's happening? ${icon('pulse', 'icon')}</button></div>
  </div>`);
}

/* ---------------- live activity panel ---------------- */
function renderLivePanel() {
  const p = document.createElement('section');
  p.className = 'live-panel'; p.id = 'live-panel'; p.setAttribute('aria-label', 'Live activity and performance');
  p.innerHTML = String(html`<header><span>${icon('pulse')} What's happening</span><button class="icon-btn" data-close-live aria-label="Close">${icon('x')}</button></header>
    <div class="live-stats" data-live-stats></div><ol class="live-log" data-live-log reversed></ol>
    <div class="small faint" style="padding:8px 14px;border-top:1px solid var(--border)">Every operation runs in your browser. Times are measured with the Performance API.</div>`);
  document.body.append(p);
  on(p, 'click', '[data-close-live]', () => p.classList.remove('open'));
  perf.subscribe(() => { if (p.classList.contains('open')) updateLive(); updatePerfLine(); });
}
function updateLive() {
  const p = $('#live-panel');
  const idx = builtEngine()?.stats || {};
  const nav = perf.navigation();
  p.querySelector('[data-live-stats]').innerHTML = String(html`
    <div><b>${perf.bootMs != null ? fmtMs(perf.bootMs) : '…'}</b><span>App ready</span></div>
    <div><b>${nav ? fmtMs(nav.ttfb) : '–'}</b><span>Server response</span></div>
    <div><b>${fmtMs(idx.totalMs ?? idx.buildMs)}</b><span>Search index</span></div>
    <div><b>${fmtNum(idx.docs)}</b><span>Docs indexed</span></div>
    <div><b>${fmtNum(store.count())}</b><span>Your entries</span></div>
    <div><b>${fmtNum(perf.counters.searches)}</b><span>Searches</span></div>`);
  p.querySelector('[data-live-log]').innerHTML = String(html`${perf.log.slice().reverse().slice(0, 80).map((e) => html`<li><span class="t">${fmtTime(e.at)}</span><span>${e.label}${e.detail ? html`<br><span class="faint small">${e.detail}</span>` : ''}</span><span class="ms">${e.ms != null ? fmtMs(e.ms) : ''}</span></li>`)}`);
}
function updatePerfLine() {
  const el = (k) => document.querySelector(`[data-perf="${k}"]`);
  if (!el('ready')) return;
  if (perf.bootMs != null) el('ready').textContent = `⚡ Ready in ${fmtMs(perf.bootMs)}`;
  const eng = builtEngine();
  if (eng) el('index').textContent = `${fmtNum(eng.stats.docs)} documents indexed in ${fmtMs(eng.stats.totalMs ?? eng.stats.buildMs)}`;
  el('local').textContent = `${fmtNum(store.count())} entries stored locally (${store.backendName})`;
}

/* ---------------- command palette search ---------------- */
function renderPalette() {
  const p = document.createElement('div');
  p.className = 'palette'; p.id = 'palette';
  p.innerHTML = String(html`<div class="palette-backdrop" data-close-search></div><div class="palette-panel" role="dialog" aria-label="Search">
    <div class="search-box">${icon('search')}<input type="search" placeholder="Search exercises, research, topics… e.g. worry, habits, sleep" aria-label="Search" autocomplete="off" spellcheck="false" data-palette-input></div>
    <div class="palette-results" data-palette-results role="listbox"></div>
    <div class="palette-foot"><span data-palette-stats>Type to search ${fmtNum(getEngine().stats.docs)} documents</span><span><kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</span></div></div>`);
  document.body.append(p);
  const input = p.querySelector('[data-palette-input]');
  let active = 0, items = [];
  const KIND = { exercise: 'Exercise', research: 'Research', area: 'Area', learn: 'Learn', page: 'Page', 'check-in': 'Check-in' };
  const run = debounce(() => {
    const q = input.value.trim();
    const out = p.querySelector('[data-palette-results]');
    if (!q) { out.innerHTML = String(html`<div class="small muted" style="padding:12px">Try: <em>procrastination</em>, <em>can't sleep</em>, <em>panic</em>, <em>66 days</em>, <em>"temptation bundling"</em>, <em>libido</em></div>`); items = []; return; }
    const res = getEngine().search(q, { limit: 9 });
    perf.counters.searches++;
    perf.event(`Searched "${q.slice(0, 40)}"`, res.ms, `${res.total} results`);
    items = res.results;
    active = 0;
    out.innerHTML = items.length ? String(html`${items.map((r, i) => html`<a class="palette-item ${i === 0 ? 'active' : ''}" href="${r.doc.url}" role="option" data-i="${i}"><span class="kind">${KIND[r.doc.kind] || r.doc.kind}</span><span><span class="t">${segs(r.titleSegs)}</span><span class="s">${segs(r.snippet)}</span></span></a>`)}
      <a class="palette-item" href="#/search?q=${encodeURIComponent(q)}"><span class="kind">All</span><span class="t">See all ${res.total} results for “${q}” →</span></a>`)
      : String(html`<div style="padding:14px">No results for “${q}”.${res.didYouMean ? html` Did you mean <a href="#/search?q=${encodeURIComponent(res.didYouMean)}">${res.didYouMean}</a>?` : ''}</div>`);
    p.querySelector('[data-palette-stats]').textContent = `${res.total} results in ${fmtMs(res.ms)} · ${fmtNum(getEngine().stats.docs)} documents`;
  }, 60);
  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => {
    const links = [...p.querySelectorAll('.palette-item')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % Math.max(1, links.length);
      links.forEach((l, i) => l.classList.toggle('active', i === active));
      links[active]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const l = links[active];
      if (l) location.hash = l.getAttribute('href'); else if (input.value.trim()) go('/search', { q: input.value.trim() });
      closePalette();
    } else if (e.key === 'Escape') closePalette();
  });
  on(p, 'click', '[data-close-search], a', () => closePalette());
  run();
}
function openPalette() { const p = $('#palette'); p.classList.add('open'); const i = p.querySelector('input'); i.focus(); i.select(); }
function closePalette() { $('#palette')?.classList.remove('open'); }

/* ---------------- theme ---------------- */
function themeIcon() { const t = pref.get('theme'); return t === 'dark' ? 'moon' : t === 'light' ? 'sun' : 'eye'; }
function cycleTheme() {
  const order = [null, 'light', 'dark'];
  const next = order[(order.indexOf(pref.get('theme')) + 1) % order.length];
  if (next) { pref.set('theme', next); document.documentElement.setAttribute('data-theme', next); } else { pref.del('theme'); document.documentElement.removeAttribute('data-theme'); }
  $('[data-theme-toggle]').innerHTML = String(icon(themeIcon()));
  toast(`Theme: ${next || 'match my device'}`);
}

/* ---------------- routes ---------------- */
function registerRoutes() {
  route('/', homeView, { section: 'home' });
  route('/areas', areasView, { section: 'areas' });
  route('/area/:id', areaView, { section: 'area' });
  route('/exercise/:id', exerciseView, { section: 'exercise' });
  route('/check-in', checkinListView, { section: 'check-in' });
  route('/check-in/:id', checkinView, { section: 'check-in' });
  route('/mood', moodView, { section: 'mood' });
  route('/plan', planView, { section: 'plan' });
  route('/journal', journalView, { section: 'journal' });
  route('/reports', reportsView, { section: 'reports' });
  route('/research', researchListView, { section: 'research' });
  route('/research/:id', researchDetailView, { section: 'research' });
  route('/search', searchView, { section: 'search' });
  route('/toolbox', toolboxView, { section: 'toolbox' });
  route('/learn', learnView, { section: 'learn' });
  route('/help', helpView, { section: 'help' });
  route('/settings', settingsView, { section: 'settings' });
  route('/privacy', privacyView, { section: 'privacy' });
  route('/about', aboutView, { section: 'about' });
  route('/404', notFoundView, { section: '404' });
  onRoute('after', (ctx) => {
    const sec = ctx.section === 'area' || ctx.section === 'exercise' ? (ctx.section === 'area' ? 'areas' : '') : ctx.section;
    document.querySelectorAll('[data-nav]').forEach((a) => (a.dataset.nav === sec ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    if (ads.routeAllowed(ctx.section)) ads.activate($('#main'));
    closePalette();
  });
}

/* ---------------- boot ---------------- */
async function boot() {
  const bootStart = window.__bootStart ?? 0;
  perf.event('Downloaded & parsed app code', perf.now() - bootStart, `${EXERCISES.length} exercises · ${research.length} papers · ${ASSESSMENTS.length} questionnaires · ${AREAS.length} areas`);
  renderHeader(); renderFooter(); renderDrawer(); renderLivePanel();
  const msg = $('#boot-msg');
  if (msg) msg.textContent = 'Opening your private local database…';
  await store.init();
  if (msg) msg.textContent = 'Building the search index…';
  buildIndex();
  renderPalette();
  registerRoutes();
  await startRouter();
  perf.setBoot(perf.now() - bootStart);
  perf.event('App ready', perf.bootMs, 'total time from first byte of script to interactive page');
  updatePerfLine();

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-search]')) { e.preventDefault(); openPalette(); }
    else if (e.target.closest('[data-theme-toggle]')) cycleTheme();
    else if (e.target.closest('[data-open-menu]')) toggleMenu(true);
    else if (e.target.closest('[data-open-live]')) { $('#live-panel').classList.add('open'); updateLive(); }
  });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openPalette(); }
    if (e.key === 'Escape') { closePalette(); toggleMenu(false); }
  });
  store.subscribe(() => updatePerfLine());
  setTimeout(() => ads.maybeAskConsent(), 1500);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') && window.top === window.self) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      perf.event('Offline mode ready (service worker registered)');
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('A new version is available.', { action: 'Reload', onAction: () => location.reload(), timeout: 12000 }); });
      });
    }).catch(() => perf.event('Service worker unavailable (offline mode off)'));
  }
}

const LOGO = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--primary)"/><path d="M9.5 19.5a6.5 6.5 0 1 1 6.5 6.5" fill="none" stroke="var(--primary-ink)" stroke-width="2.4" stroke-linecap="round"/><path d="M16 26l-2.6-2.4L16 21" fill="none" stroke="var(--primary-ink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="13" r="2.2" fill="var(--primary-ink)"/></svg>`;

boot().catch((err) => {
  console.error(err);
  const m = document.getElementById('main');
  if (m) m.innerHTML = `<div class="container"><div class="callout warn"><p><strong>Sorry — the toolkit failed to start.</strong> ${esc(err.message || err)}</p><p>Try reloading the page. If you are in private browsing mode, some browsers block local storage.</p></div></div>`;
});
