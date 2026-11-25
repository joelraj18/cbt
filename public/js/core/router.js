// Hash router: works on any static host (Cloudflare Pages, GitHub Pages, file://) with no server rewrites.
import { perf } from './perf.js';

const routes = [];
let current = null;
let cleanup = null;
const hooks = { before: [], after: [] };

/** Register a route. pattern like '/area/:id'. view: async (ctx) => ({ title, body, mount?(root) }) */
export function route(pattern, view, meta = {}) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/\/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
  routes.push({ pattern, re, keys, view, meta });
}

export function parseHash(hash = location.hash) {
  const h = hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = h.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  return { path: path.startsWith('/') ? path : '/' + path, query };
}

export function match(path) {
  for (const r of routes) {
    const m = r.re.exec(path);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { route: r, params };
    }
  }
  return null;
}

export const href = (path, query) => '#' + path + (query && Object.keys(query).length ? '?' + new URLSearchParams(query) : '');
export function go(path, query, { replace = false } = {}) {
  const h = href(path, query);
  if (replace) { history.replaceState(null, '', h); render(); } else if (location.hash === h) render(); else location.hash = h;
}
export const onRoute = (when, fn) => hooks[when].push(fn);
export const currentRoute = () => current;

export async function render() {
  const outlet = document.getElementById('main');
  const { path, query } = parseHash();
  const m = match(path) || match('/404');
  const t0 = perf.now();
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignore */ } }
  cleanup = null;
  const ctx = { path, query, params: m.params, meta: m.route.meta, section: m.route.meta.section || path.split('/')[1] || 'home' };
  hooks.before.forEach((fn) => fn(ctx));
  let out;
  try {
    out = await m.route.view(ctx);
  } catch (err) {
    console.error(err);
    out = { title: 'Something went wrong', body: `<div class="container"><div class="callout warn"><p><strong>Sorry — this page failed to load.</strong></p><p class="small">${String(err && err.message || err).replace(/</g, '&lt;')}</p><p><a href="#/">Go to the home page</a></p></div></div>` };
  }
  outlet.innerHTML = String(out.body ?? '');
  document.title = out.title ? `${out.title} · CBT Toolkit` : 'CBT Toolkit — evidence-based CBT exercises';
  if (out.mount) { try { cleanup = await out.mount(outlet, ctx) || null; } catch (err) { console.error(err); } }
  current = ctx;
  const ms = perf.now() - t0;
  perf.counters.renders++;
  perf.event(`Rendered ${path}`, ms);
  hooks.after.forEach((fn) => fn(ctx, ms));
  if (!ctx.query.keepScroll) window.scrollTo(0, 0);
  const h1 = outlet.querySelector('h1');
  if (h1 && document.activeElement !== document.querySelector('.palette input')) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  return render();
}
