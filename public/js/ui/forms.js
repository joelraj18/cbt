// Schema-driven exercise forms: step-by-step wizard, autosaved drafts, validation,
// live computed results, repeatable lists, emotion pickers and timed rating trackers.
import { html, raw, esc, on, debounce, pref } from '../core/dom.js';
import { fmtDuration, relTime } from '../core/format.js';
import { icon } from '../core/icons.js';

export const EMOTIONS = ['Sad', 'Anxious', 'Angry', 'Guilty', 'Ashamed', 'Lonely', 'Hopeless', 'Frustrated', 'Embarrassed', 'Overwhelmed', 'Irritable', 'Jealous', 'Scared', 'Disappointed', 'Numb', 'Hurt', 'Restless', 'Bored', 'Calm', 'Hopeful', 'Content', 'Proud'];

const isEmpty = (v) => v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && v.points && !v.points.length);

function defaultsFor(fields, data) {
  for (const f of fields) {
    if (data[f.id] !== undefined || !f.id) continue;
    if (f.default !== undefined) data[f.id] = typeof f.default === 'function' ? f.default() : structuredClone(f.default);
    else if (f.type === 'list') data[f.id] = Array.from({ length: f.minRows ?? 1 }, () => ({}));
    else if (['chips', 'checklist', 'emotions'].includes(f.type)) data[f.id] = [];
    else if (f.type === 'slider') data[f.id] = f.start ?? null;
  }
}

function opts(f) { return (f.options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o)); }

function sliderHTML(id, attrs, f, v, sub = '') {
  const val = v ?? f.start ?? Math.round(((f.min ?? 0) + (f.max ?? 100)) / 2);
  const shown = v == null ? '–' : v;
  return html`<div class="slider-wrap"><input type="range" id="${id}" ${raw(attrs)} min="${f.min ?? 0}" max="${f.max ?? 100}" step="${f.step ?? 1}" value="${val}" aria-describedby="${id}-lab" ${v == null ? raw('data-unset="1"') : ''}>
    <output for="${id}" data-out="${id}">${shown}</output></div>
    <div class="slider-labels" id="${id}-lab"><span>${f.minLabel ?? f.min ?? 0}</span>${f.midLabel ? html`<span>${f.midLabel}</span>` : ''}<span>${f.maxLabel ?? f.max ?? 100}</span></div>${sub}`;
}

function inputHTML(f, v, attrs, id) {
  switch (f.type) {
    case 'textarea': return html`<textarea id="${id}" ${raw(attrs)} rows="${f.rows || 3}" placeholder="${f.placeholder || ''}">${v ?? ''}</textarea>`;
    case 'number': return html`<input type="number" id="${id}" ${raw(attrs)} inputmode="decimal" min="${f.min ?? ''}" max="${f.max ?? ''}" step="${f.step ?? 'any'}" value="${v ?? ''}" placeholder="${f.placeholder || ''}">${f.unit ? html`<div class="help">${f.unit}</div>` : ''}`;
    case 'slider': return sliderHTML(id, attrs, f, v);
    case 'select': return html`<select id="${id}" ${raw(attrs)}><option value="">Choose…</option>${opts(f).map((o) => html`<option value="${o.value}" ${o.value === v ? raw('selected') : ''}>${o.label}</option>`)}</select>`;
    case 'date': case 'time': case 'datetime-local': return html`<input type="${f.type}" id="${id}" ${raw(attrs)} value="${v ?? ''}">`;
    case 'checkbox': return html`<label class="check"><input type="checkbox" id="${id}" ${raw(attrs)} ${v ? raw('checked') : ''}><span>${f.checkLabel || f.label}</span></label>`;
    default: return html`<input type="text" id="${id}" ${raw(attrs)} value="${v ?? ''}" placeholder="${f.placeholder || ''}" autocomplete="off">`;
  }
}

function fieldHTML(f, data, uidp, trackers) {
  const id = `${uidp}-${f.id || Math.random().toString(36).slice(2)}`;
  const v = data[f.id];
  const req = f.required ? html`<span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span>` : '';
  const label = f.label && f.type !== 'checkbox' ? html`<label for="${id}" class="label">${f.label}${req}</label>` : '';
  const help = f.help ? html`<p class="help">${f.help}</p>` : '';
  const hidden = f.showIf && !f.showIf(data) ? raw('hidden') : '';
  const wrap = (inner, extra = '') => html`<div class="field" data-field="${f.id || ''}" ${hidden} ${raw(extra)}>${label}${help}${inner}<div class="err" data-err="${f.id || ''}" hidden></div></div>`;
  switch (f.type) {
    case 'info': return html`<div class="callout ${f.tone || 'info'}" data-field="${f.id || ''}" ${hidden}>${f.title ? html`<div class="callout-title">${f.title}</div>` : ''}${typeof f.html === 'function' ? raw(f.html(data)) : f.html ? raw(f.html) : f.text}</div>`;
    case 'computed': return html`<div class="field" data-field="${f.id}" ${hidden}>${f.label ? html`<div class="label">${f.label}</div>` : ''}<div class="computed" data-computed="${f.id}" aria-live="polite">${raw(f.compute(data) ?? '')}</div></div>`;
    case 'radio': return wrap(html`<div class="radio-cards" role="radiogroup" aria-label="${f.label}">${opts(f).map((o, i) => html`<label class="radio-card"><input type="radio" name="${id}" data-fid="${f.id}" value="${o.value}" ${o.value === v ? raw('checked') : ''} ${i === 0 ? raw(`id="${id}"`) : ''}><span>${o.label}${o.help ? html`<br><span class="small muted">${o.help}</span>` : ''}</span></label>`)}</div>`);
    case 'chips': {
      const sel = new Set(v || []);
      const all = [...opts(f), ...[...sel].filter((s) => !opts(f).some((o) => o.value === s)).map((s) => ({ value: s, label: s }))];
      return wrap(html`<div class="options" role="group" aria-label="${f.label}">${all.map((o) => html`<button type="button" class="chip" data-chip="${f.id}" data-value="${o.value}" aria-pressed="${sel.has(o.value)}" ${o.help ? raw(`title="${esc(o.help)}"`) : ''}>${o.label}</button>`)}</div>
        ${f.allowCustom ? html`<div class="cluster" style="margin-top:8px"><input type="text" data-custom="${f.id}" placeholder="${f.customPlaceholder || 'Add your own…'}" style="max-width:280px"><button type="button" class="btn small" data-add-custom="${f.id}">Add</button></div>` : ''}`);
    }
    case 'checklist': {
      const sel = new Set(v || []);
      return wrap(html`<div>${opts(f).map((o) => html`<label class="check"><input type="checkbox" data-check="${f.id}" value="${o.value}" ${sel.has(o.value) ? raw('checked') : ''}><span>${o.label}${o.help ? html`<br><span class="small muted">${o.help}</span>` : ''}</span></label>`)}</div>`);
    }
    case 'emotions': {
      const list = v || [];
      const names = new Set(list.map((e) => e.name));
      const choices = f.options || EMOTIONS;
      return wrap(html`<div class="options">${choices.map((n) => html`<button type="button" class="chip" data-emo-toggle="${f.id}" data-value="${n}" aria-pressed="${names.has(n)}">${n}</button>`)}</div>
        <div style="margin-top:12px">${list.map((e) => html`<div class="emotion-row"><strong>${e.name}</strong><input type="range" min="0" max="100" step="5" value="${e.v ?? 50}" data-emo="${f.id}" data-name="${e.name}" aria-label="${e.name} intensity"><output>${e.v ?? 50}</output></div>`)}</div>
        ${list.length ? html`<p class="help" style="margin-top:6px">Rate how strong each feeling is (0 = not at all, 100 = the most intense ever).</p>` : ''}`);
    }
    case 'list': {
      const rows = v || [];
      return wrap(html`<div data-list-wrap="${f.id}">${rows.map((row, i) => html`<div class="list-row"><div class="row-head"><span>${f.rowLabel || 'Item'} ${i + 1}</span>${rows.length > (f.minRows ?? 0) ? html`<button type="button" class="btn ghost small" data-remove="${f.id}" data-row="${i}" aria-label="Remove ${f.rowLabel || 'item'} ${i + 1}">${icon('trash')}</button>` : ''}</div>
          ${f.fields.map((sf) => { const sid = `${id}-${i}-${sf.id}`; const attrs = `data-list="${f.id}" data-row="${i}" data-sub="${sf.id}"`; return html`<div class="field">${sf.type !== 'checkbox' ? html`<label for="${sid}" class="label">${sf.label}</label>` : ''}${sf.help ? html`<p class="help">${sf.help}</p>` : ''}${inputHTML(sf, row[sf.id], attrs, sid)}</div>`; })}</div>`)}</div>
        ${rows.length < (f.maxRows ?? 30) ? html`<button type="button" class="btn soft small" data-add="${f.id}">${icon('plus')} ${f.addLabel || 'Add another'}</button>` : ''}`);
    }
    case 'tracker': {
      const tv = v || { points: [] };
      const running = trackers.has(f.id);
      const last = tv.points.at(-1);
      return wrap(html`<div class="card flat" data-tracker="${f.id}">
          <div class="split"><div><div class="small muted">Elapsed</div><div class="timer-display" style="font-size:2.2rem;text-align:left" data-elapsed="${f.id}">${fmtDuration(tv.elapsed || 0)}</div></div>
          <div class="cluster">${running ? html`<button type="button" class="btn" data-track-stop="${f.id}">${icon('stop')} Stop</button>` : html`<button type="button" class="btn primary" data-track-start="${f.id}">${icon('play')} ${tv.points.length ? 'Resume' : 'Start timer'}</button>`}</div></div>
          <div class="big-cue small muted" data-prompt="${f.id}" style="text-align:left;min-height:1.6em">${running ? `Rate every ${Math.round((f.interval || 60) / 60)} minute${(f.interval || 60) > 60 ? 's' : ''} — or whenever it changes.` : tv.points.length ? `${tv.points.length} ratings logged. Peak ${Math.max(...tv.points.map((p) => p.v))}, last ${last.v}.` : f.idleText || 'Press start, then log a rating now and every minute or so.'}</div>
          <div class="field" style="margin:10px 0 6px"><label class="label" for="${id}-rate">${f.rateLabel || 'Rate it now'}</label>${sliderHTML(`${id}-rate`, `data-track-rate="${f.id}"`, { min: 0, max: f.max ?? 10, minLabel: f.minLabel ?? '0', maxLabel: f.maxLabel ?? String(f.max ?? 10) }, last?.v ?? null)}</div>
          <button type="button" class="btn soft small" data-track-log="${f.id}" ${running ? '' : raw('disabled')}>${icon('plus')} Log this rating</button>
          <div data-track-chart="${f.id}" style="margin-top:12px">${raw(trackerSVG(tv.points, f.max ?? 10))}</div>
        </div>`);
    }
    default: return wrap(inputHTML(f, v, `data-fid="${f.id}"`, id));
  }
}

export function trackerSVG(points, max = 10, W = 560, H = 120) {
  if (!points || points.length < 1) return '';
  const tMax = Math.max(60, points.at(-1).t);
  const x = (t) => 8 + (t / tMax) * (W - 16), y = (v) => H - 18 - (v / max) * (H - 30);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" role="img" aria-label="Ratings over time: ${points.map((p) => p.v).join(', ')}">
    <line x1="8" x2="${W - 8}" y1="${H - 18}" y2="${H - 18}" stroke="var(--axis)"/>
    <line x1="8" x2="${W - 8}" y1="${y(max / 2)}" y2="${y(max / 2)}" stroke="var(--grid)"/>
    <path d="${d}" fill="none" stroke="var(--area, var(--s1))" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((p) => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4" fill="var(--area, var(--s1))" stroke="var(--surface)" stroke-width="2"/>`).join('')}
    <text x="8" y="${H - 3}" class="tick" fill="var(--text-3)" font-size="11">0:00</text><text x="${W - 8}" y="${H - 3}" text-anchor="end" fill="var(--text-3)" font-size="11">${fmtDuration(tMax)}</text>
  </svg>`;
}

/**
 * Render an interactive form into `container`.
 * schema: { steps:[{title, intro, fields}] } or { fields }
 * options: { initial, draftKey, onSave(data), onCancel, saveLabel, title }
 */
export function createForm(container, schema, options = {}) {
  const steps = schema.steps || [{ title: schema.title || '', intro: schema.intro || '', fields: schema.fields || [] }];
  const allFields = steps.flatMap((s) => s.fields);
  const uidp = 'f' + Math.random().toString(36).slice(2, 7);
  let data = structuredClone(options.initial || {});
  let step = 0;
  const visited = new Set([0]);
  const trackers = new Map(); // fieldId -> {interval, startedAt, base}
  let draftInfo = null;

  if (!options.initial && options.draftKey) {
    try { const d = JSON.parse(pref.get('draft:' + options.draftKey) || 'null'); if (d && d.data) { data = d.data; step = Math.min(d.step || 0, steps.length - 1); draftInfo = d.savedAt; for (let i = 0; i <= step; i++) visited.add(i); } } catch { /* ignore */ }
  }
  defaultsFor(allFields, data);

  const saveDraft = debounce(() => { if (options.draftKey) pref.set('draft:' + options.draftKey, JSON.stringify({ data, step, savedAt: new Date().toISOString() })); }, 400);
  const clearDraft = () => { if (options.draftKey) pref.del('draft:' + options.draftKey); };

  function refreshDynamic() {
    for (const f of allFields) {
      if (f.showIf) { const n = container.querySelector(`[data-field="${f.id}"]`); if (n) n.hidden = !f.showIf(data); }
      if (f.type === 'computed') { const n = container.querySelector(`[data-computed="${f.id}"]`); if (n) n.innerHTML = String(f.compute(data) ?? ''); }
    }
  }

  function validate(fields) {
    let ok = true, first = null;
    for (const f of fields) {
      const errEl = container.querySelector(`[data-err="${f.id}"]`);
      if (!errEl) continue;
      const visible = !f.showIf || f.showIf(data);
      let msg = '';
      if (visible && f.required && isEmpty(data[f.id])) msg = f.requiredMessage || 'Please fill this in before continuing.';
      if (visible && f.validate && !msg) msg = f.validate(data[f.id], data) || '';
      errEl.textContent = msg; errEl.hidden = !msg;
      if (msg) { ok = false; first = first || errEl.closest('.field'); }
    }
    if (first) first.querySelector('input,textarea,select,button')?.focus();
    return ok;
  }

  function render() {
    const s = steps[step];
    const multi = steps.length > 1;
    const pctDone = Math.round(((step + 1) / steps.length) * 100);
    container.innerHTML = String(html`<form class="wizard" novalidate>
      ${multi || options.title ? html`<div class="wizard-head">
        <div class="split"><div><div class="small muted">${multi ? `Step ${step + 1} of ${steps.length}` : options.title}</div>${s.title ? html`<h3 class="step-title">${s.title}</h3>` : ''}</div>
        ${draftInfo ? html`<span class="draft-note">Draft restored (${relTime(draftInfo)}) · <button type="button" class="btn ghost small" data-discard>Start over</button></span>` : ''}</div>
        ${multi ? html`<div class="progress" style="margin-top:10px" role="progressbar" aria-valuenow="${pctDone}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress"><span style="width:${pctDone}%"></span></div>
        <div class="step-dots">${steps.map((st, i) => html`<button type="button" class="step-dot ${i === step ? 'current' : visited.has(i) ? 'done' : ''}" data-goto="${i}" ${visited.has(i) || i === step ? '' : raw('disabled')}>${i + 1}. ${st.short || st.title}</button>`)}</div>` : ''}
      </div>` : ''}
      <div class="wizard-body">${s.intro ? html`<p class="step-intro">${raw(s.intro)}</p>` : ''}${s.fields.map((f) => fieldHTML(f, data, uidp, trackers))}</div>
      <div class="wizard-foot">
        <div class="cluster">${step > 0 ? html`<button type="button" class="btn" data-back>${icon('back')} Back</button>` : options.onCancel ? html`<button type="button" class="btn ghost" data-cancel>Cancel</button>` : ''}</div>
        <div class="cluster"><span class="draft-note" data-draft-note>${options.draftKey ? 'Autosaving draft on this device' : ''}</span>
          ${step < steps.length - 1 ? html`<button type="button" class="btn primary" data-next>Next ${icon('arrow')}</button>` : html`<button type="submit" class="btn primary" data-save>${icon('check')} ${options.saveLabel || 'Save entry'}</button>`}</div>
      </div></form>`);
    // tracker charts may need slider "unset" marker cleared once moved
    for (const [fid] of trackers) tickTracker(fid);
  }

  function tickTracker(fid) {
    const tr = trackers.get(fid); if (!tr) return;
    const tv = data[fid];
    tv.elapsed = Math.round(tr.base + (Date.now() - tr.startedAt) / 1000);
    const el = container.querySelector(`[data-elapsed="${fid}"]`);
    if (el) el.textContent = fmtDuration(tv.elapsed);
    const f = allFields.find((x) => x.id === fid);
    const lastT = tv.points.at(-1)?.t ?? -Infinity;
    const due = tv.elapsed - lastT >= (f.interval || 60);
    const prompt = container.querySelector(`[data-prompt="${fid}"]`);
    const btn = container.querySelector(`[data-track-log="${fid}"]`);
    if (prompt && due) { prompt.textContent = `⏰ Time for a new rating (${fmtDuration(tv.elapsed)}).`; btn?.classList.add('primary'); }
    if (f.maxSeconds && tv.elapsed >= f.maxSeconds) stopTracker(fid);
  }
  function startTracker(fid) {
    const tv = data[fid] || (data[fid] = { points: [] });
    tv.start = tv.start || new Date().toISOString();
    const iv = setInterval(() => tickTracker(fid), 1000);
    trackers.set(fid, { iv, startedAt: Date.now(), base: tv.elapsed || 0 });
    render();
  }
  function stopTracker(fid) {
    const tr = trackers.get(fid); if (!tr) return;
    tickTracker(fid); clearInterval(tr.iv); trackers.delete(fid);
    saveDraft(); render(); refreshDynamic();
  }
  function logTracker(fid) {
    const tv = data[fid];
    const input = container.querySelector(`[data-track-rate="${fid}"]`);
    const v = Number(input.value);
    tickTracker(fid);
    tv.points.push({ t: tv.elapsed || 0, v });
    const chart = container.querySelector(`[data-track-chart="${fid}"]`);
    const f = allFields.find((x) => x.id === fid);
    if (chart) chart.innerHTML = trackerSVG(tv.points, f.max ?? 10);
    const prompt = container.querySelector(`[data-prompt="${fid}"]`);
    if (prompt) prompt.textContent = `Logged ${v} at ${fmtDuration(tv.elapsed || 0)}. Next rating in about ${Math.round((f.interval || 60) / 60)} min.`;
    container.querySelector(`[data-track-log="${fid}"]`)?.classList.remove('primary');
    saveDraft(); refreshDynamic();
  }

  const offs = [];
  offs.push(on(container, 'input', 'input,textarea,select', (e, t) => {
    if (t.dataset.fid) {
      const f = allFields.find((x) => x.id === t.dataset.fid);
      if (t.type === 'checkbox') data[f.id] = t.checked;
      else if (t.type === 'radio') data[f.id] = t.value;
      else if (f.type === 'number' || f.type === 'slider') data[f.id] = t.value === '' ? null : Number(t.value);
      else data[f.id] = t.value;
      if (t.type === 'range') { const o = container.querySelector(`[data-out="${t.id}"]`); if (o) o.textContent = t.value; t.removeAttribute('data-unset'); }
    } else if (t.dataset.list) {
      const row = data[t.dataset.list][Number(t.dataset.row)];
      const f = allFields.find((x) => x.id === t.dataset.list).fields.find((x) => x.id === t.dataset.sub);
      row[t.dataset.sub] = t.type === 'checkbox' ? t.checked : (f.type === 'number' || f.type === 'slider') ? (t.value === '' ? null : Number(t.value)) : t.value;
      if (t.type === 'range') { const o = container.querySelector(`[data-out="${t.id}"]`); if (o) o.textContent = t.value; }
    } else if (t.dataset.emo) {
      const item = data[t.dataset.emo].find((x) => x.name === t.dataset.name);
      if (item) item.v = Number(t.value);
      const o = t.nextElementSibling; if (o) o.textContent = t.value;
    } else if (t.dataset.check) {
      const set = new Set(data[t.dataset.check] || []);
      t.checked ? set.add(t.value) : set.delete(t.value);
      data[t.dataset.check] = [...set];
    } else if (t.dataset.trackRate) {
      const o = container.querySelector(`[data-out="${t.id}"]`); if (o) o.textContent = t.value;
      return;
    } else return;
    saveDraft(); refreshDynamic();
  }));
  offs.push(on(container, 'change', 'input[type=radio],input[type=checkbox],select', (e, t) => {
    if (t.dataset.fid && (t.type === 'radio' || t.type === 'checkbox' || t.tagName === 'SELECT')) {
      data[t.dataset.fid] = t.type === 'checkbox' ? t.checked : t.value;
      saveDraft(); refreshDynamic();
    }
  }));
  offs.push(on(container, 'click', 'button', async (e, b) => {
    const d = b.dataset;
    if (d.chip) {
      const set = new Set(data[d.chip] || []);
      const f = allFields.find((x) => x.id === d.chip);
      if (set.has(d.value)) set.delete(d.value); else { if (f.max && set.size >= f.max) return; set.add(d.value); }
      data[d.chip] = [...set];
      b.setAttribute('aria-pressed', String(set.has(d.value)));
      saveDraft(); refreshDynamic();
    } else if (d.addCustom) {
      const input = container.querySelector(`[data-custom="${d.addCustom}"]`);
      const val = input.value.trim(); if (!val) return;
      data[d.addCustom] = [...new Set([...(data[d.addCustom] || []), val])];
      saveDraft(); render(); refreshDynamic();
    } else if (d.emoToggle) {
      const list = data[d.emoToggle] || (data[d.emoToggle] = []);
      const i = list.findIndex((x) => x.name === d.value);
      if (i >= 0) list.splice(i, 1); else list.push({ name: d.value, v: 50 });
      saveDraft(); render(); refreshDynamic();
      container.querySelector(`[data-emo-toggle="${d.emoToggle}"][data-value="${d.value}"]`)?.focus();
    } else if (d.add) {
      data[d.add].push({});
      saveDraft(); render(); refreshDynamic();
      const rows = container.querySelectorAll(`[data-list="${d.add}"][data-row="${data[d.add].length - 1}"]`);
      rows[0]?.focus();
    } else if (d.remove) {
      data[d.remove].splice(Number(d.row), 1);
      saveDraft(); render(); refreshDynamic();
    } else if (d.trackStart) startTracker(d.trackStart);
    else if (d.trackStop) stopTracker(d.trackStop);
    else if (d.trackLog) logTracker(d.trackLog);
    else if ('next' in d) { if (validate(steps[step].fields)) { step++; visited.add(step); saveDraft(); render(); refreshDynamic(); container.scrollIntoView({ block: 'start', behavior: 'smooth' }); } }
    else if ('back' in d) { step--; saveDraft(); render(); refreshDynamic(); }
    else if (d.goto) { const i = Number(d.goto); if (i < step || visited.has(i)) { step = i; render(); refreshDynamic(); } }
    else if ('cancel' in d) options.onCancel?.();
    else if ('discard' in d) { clearDraft(); data = {}; defaultsFor(allFields, data); step = 0; draftInfo = null; visited.clear(); visited.add(0); render(); refreshDynamic(); }
  }));
  offs.push(on(container, 'submit', 'form', async (e) => {
    e.preventDefault();
    for (const fid of [...trackers.keys()]) stopTracker(fid);
    if (!validate(steps[step].fields)) return;
    // validate all steps before saving
    for (let i = 0; i < steps.length; i++) {
      const missing = steps[i].fields.find((f) => f.required && (!f.showIf || f.showIf(data)) && isEmpty(data[f.id]));
      if (missing) { step = i; render(); refreshDynamic(); validate(steps[i].fields); return; }
    }
    const btn = container.querySelector('[data-save]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loader"></span> Saving…'; }
    try { await options.onSave?.(structuredClone(data)); clearDraft(); }
    catch (err) { console.error(err); if (btn) { btn.disabled = false; btn.textContent = 'Try saving again'; } }
  }));

  render();
  refreshDynamic();
  return {
    getData: () => structuredClone(data),
    destroy() { offs.forEach((f) => f()); for (const [, tr] of trackers) clearInterval(tr.iv); trackers.clear(); },
  };
}

/** Printable blank worksheet for therapists and offline use. */
export function worksheetHTML(ex) {
  const steps = ex.form?.steps || (ex.form?.fields ? [{ title: '', fields: ex.form.fields }] : []);
  const fieldWS = (f) => {
    if (f.type === 'info' || f.type === 'computed' || f.type === 'tracker') return f.type === 'tracker' ? html`<div class="ws-field"><div class="ws-label">${f.label}</div><div class="ws-help">Write a rating (0–${f.max ?? 10}) every minute: __ __ __ __ __ __ __ __ __ __</div></div>` : '';
    const lines = f.type === 'textarea' ? 3 : 1;
    let body;
    if (f.type === 'slider') body = html`<div class="scale"><span>${f.min ?? 0} ${f.minLabel ? `– ${f.minLabel}` : ''}</span><span>${f.max ?? 100} ${f.maxLabel ? `– ${f.maxLabel}` : ''}</span></div>`;
    else if (['chips', 'checklist', 'radio', 'select'].includes(f.type)) body = html`<div class="ws-help">${opts(f).map((o) => `☐ ${o.label}`).join('   ')}</div>`;
    else if (f.type === 'emotions') body = html`<div class="ws-help">Emotion(s) and intensity 0–100:</div><div class="line"></div><div class="line"></div>`;
    else if (f.type === 'list') body = html`${Array.from({ length: 3 }, (_, i) => html`<div class="ws-help">${f.rowLabel || 'Item'} ${i + 1}: ${f.fields.map((s) => s.label).join(' · ')}</div><div class="line"></div>`)}`;
    else body = raw('<div class="line"></div>'.repeat(lines));
    return html`<div class="ws-field"><div class="ws-label">${f.label}</div>${f.help ? html`<div class="ws-help">${f.help}</div>` : ''}${body}</div>`;
  };
  return String(html`<div class="ws"><h1>${ex.title}</h1><p>${ex.simple}</p><p class="ws-help">Date: ____________ &nbsp;&nbsp; CBT Toolkit worksheet · Evidence level ${ex.level}</p>
    ${steps.map((s) => html`${s.title ? html`<h3>${s.title}</h3>` : ''}${s.fields.map(fieldWS)}`)}</div>`);
}
