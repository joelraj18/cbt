// Safe-by-default HTML templating and small DOM helpers.
// Every interpolated value is escaped unless it was produced by html`` or raw().

export class SafeHTML {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const raw = (s) => new SafeHTML(String(s ?? ''));

function value(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof SafeHTML) return v.s;
  if (Array.isArray(v)) return v.map(value).join('');
  return esc(v);
}

export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += value(vals[i]) + strings[i + 1];
  return new SafeHTML(out);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Delegated event listener; returns an unsubscribe function. */
export function on(root, type, selector, handler, opts) {
  const fn = (e) => {
    const t = e.target instanceof Element ? e.target.closest(selector) : null;
    if (t && root.contains(t)) handler(e, t);
  };
  root.addEventListener(type, fn, opts);
  return () => root.removeEventListener(type, fn, opts);
}

export function setHTML(el, content) { el.innerHTML = String(content ?? ''); return el; }

export function debounce(fn, ms = 250) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Lightweight toast notification. */
export function toast(message, { action, onAction, timeout = 3800 } = {}) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast';
  const span = document.createElement('span');
  span.textContent = message;
  el.append(span);
  if (action) {
    const b = document.createElement('button');
    b.textContent = action;
    b.addEventListener('click', () => { onAction?.(); el.remove(); });
    el.append(b);
  }
  host.append(el);
  setTimeout(() => el.remove(), timeout);
}

/** Promise-based confirm dialog built on <dialog>. */
export function confirmDialog({ title, body, confirm = 'Confirm', cancel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.innerHTML = String(html`<form method="dialog"><div class="dialog-body"><h3>${title}</h3><p class="muted">${body}</p></div>
      <div class="dialog-foot"><button type="button" class="btn ghost" data-cancel>${cancel}</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" value="ok">${confirm}</button></div></form>`);
    document.body.append(d);
    d.querySelector('[data-cancel]').addEventListener('click', () => d.close('cancel'));
    d.addEventListener('close', () => { resolve(d.returnValue === 'ok'); d.remove(); });
    d.showModal();
  });
}

/** Prompt dialog with a single input. */
export function promptDialog({ title, body = '', label = '', type = 'text', confirm = 'OK', placeholder = '' }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.innerHTML = String(html`<form method="dialog"><div class="dialog-body"><h3>${title}</h3>${body ? html`<p class="muted">${body}</p>` : ''}
      <div class="field"><label for="dlg-input">${label}</label><input id="dlg-input" type="${type}" placeholder="${placeholder}" autocomplete="off"></div></div>
      <div class="dialog-foot"><button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn primary" value="ok">${confirm}</button></div></form>`);
    document.body.append(d);
    d.querySelector('[data-cancel]').addEventListener('click', () => d.close('cancel'));
    const input = d.querySelector('input');
    d.addEventListener('close', () => { resolve(d.returnValue === 'ok' ? input.value : null); d.remove(); });
    d.showModal();
    input.focus();
  });
}

export function download(filename, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/** Read a cookie-free local preference safely (storage may be blocked). */
export const pref = {
  get(key, fallback = null) { try { const v = localStorage.getItem('cbt:' + key); return v == null ? fallback : v; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('cbt:' + key, value); } catch { /* ignore */ } },
  del(key) { try { localStorage.removeItem('cbt:' + key); } catch { /* ignore */ } },
};
