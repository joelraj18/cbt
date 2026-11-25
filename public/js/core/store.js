// Local-only persistence. Everything is stored in this browser (IndexedDB, with a
// localStorage fallback). Nothing is ever sent to a server.
import { perf } from './perf.js';
import { uid } from './dom.js';

const DB_NAME = 'cbt-toolkit';
const DB_VERSION = 1;
const LS_KEY = 'cbt:fallback-db';
const listeners = new Set();

function reqP(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}
function txDone(tx) {
  return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
}

/* ---------- IndexedDB backend ---------- */
function idbBackend() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('IndexedDB unavailable'));
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { return reject(e); }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('records')) {
        const s = db.createObjectStore('records', { keyPath: 'id' });
        s.createIndex('kind', 'kind');
        s.createIndex('type', 'type');
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
    req.onsuccess = () => {
      const db = req.result;
      const store = (name, mode = 'readonly') => db.transaction(name, mode).objectStore(name);
      resolve({
        name: 'IndexedDB',
        async getAll() { return reqP(store('records').getAll()); },
        async get(id) { return reqP(store('records').get(id)); },
        async put(rec) { const tx = db.transaction('records', 'readwrite'); tx.objectStore('records').put(rec); await txDone(tx); },
        async del(id) { const tx = db.transaction('records', 'readwrite'); tx.objectStore('records').delete(id); await txDone(tx); },
        async byIndex(index, value) { return reqP(store('records').index(index).getAll(value)); },
        async kvGet(key) { const r = await reqP(store('kv').get(key)); return r ? r.value : undefined; },
        async kvSet(key, value) { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ key, value }); await txDone(tx); },
        async kvDel(key) { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(key); await txDone(tx); },
        async kvAll() { return reqP(store('kv').getAll()); },
        async bulk(records, kv) {
          const tx = db.transaction(['records', 'kv'], 'readwrite');
          records.forEach((r) => tx.objectStore('records').put(r));
          kv.forEach((k) => tx.objectStore('kv').put(k));
          await txDone(tx);
        },
        async clear() {
          const tx = db.transaction(['records', 'kv'], 'readwrite');
          tx.objectStore('records').clear(); tx.objectStore('kv').clear();
          await txDone(tx);
        },
      });
    };
  });
}

/* ---------- localStorage / memory fallback ---------- */
function lsBackend() {
  let mem = { records: {}, kv: {} };
  let persistent = true;
  try { const s = localStorage.getItem(LS_KEY); if (s) mem = JSON.parse(s); } catch { persistent = false; }
  const save = () => { if (!persistent) return; try { localStorage.setItem(LS_KEY, JSON.stringify(mem)); } catch { persistent = false; } };
  return {
    name: persistent ? 'localStorage' : 'memory (not saved)',
    async getAll() { return Object.values(mem.records); },
    async get(id) { return mem.records[id]; },
    async put(rec) { mem.records[rec.id] = rec; save(); },
    async del(id) { delete mem.records[id]; save(); },
    async byIndex(index, value) { return Object.values(mem.records).filter((r) => r[index] === value); },
    async kvGet(key) { return mem.kv[key]; },
    async kvSet(key, value) { mem.kv[key] = value; save(); },
    async kvDel(key) { delete mem.kv[key]; save(); },
    async kvAll() { return Object.entries(mem.kv).map(([key, value]) => ({ key, value })); },
    async bulk(records, kv) { records.forEach((r) => { mem.records[r.id] = r; }); kv.forEach((k) => { mem.kv[k.key] = k.value; }); save(); },
    async clear() { mem = { records: {}, kv: {} }; save(); },
  };
}

let backend = null;
let cache = null; // in-memory mirror of all records for fast queries

const emit = (type, detail) => listeners.forEach((fn) => { try { fn({ type, ...detail }); } catch { /* ignore */ } });

export const store = {
  async init() {
    const t0 = perf.now();
    try { backend = await idbBackend(); } catch { backend = lsBackend(); }
    cache = await backend.getAll();
    perf.event(`Opened local database (${backend.name})`, perf.now() - t0, `${cache.length} saved entries`);
    // Ask the browser to keep our data (best effort; never block start-up on it — some browsers wait for a prompt).
    try { navigator.storage?.persist?.().then((ok) => perf.event(`Persistent storage ${ok ? 'granted' : 'not granted (browser may evict data under pressure — keep backups)'}`)).catch(() => {}); } catch { /* ignore */ }
    return this;
  },
  get backendName() { return backend?.name || '—'; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** Create a record. kind: exercise | assessment | mood | session */
  async add({ kind, type, area = null, data = {}, metrics = {}, createdAt }) {
    const t0 = perf.now();
    const ts = createdAt || new Date().toISOString();
    const rec = { id: uid(), kind, type, area, createdAt: ts, updatedAt: new Date().toISOString(), data, metrics };
    await backend.put(rec);
    cache.push(rec);
    perf.counters.saves++;
    perf.event(`Saved ${kind}: ${type}`, perf.now() - t0, 'stored locally in this browser');
    emit('add', { record: rec });
    return rec;
  },
  async update(id, patch) {
    const t0 = perf.now();
    const i = cache.findIndex((r) => r.id === id);
    if (i < 0) throw new Error('Record not found');
    const rec = { ...cache[i], ...patch, updatedAt: new Date().toISOString() };
    await backend.put(rec);
    cache[i] = rec;
    perf.event(`Updated ${rec.kind}: ${rec.type}`, perf.now() - t0);
    emit('update', { record: rec });
    return rec;
  },
  async remove(id) {
    const t0 = perf.now();
    await backend.del(id);
    const rec = cache.find((r) => r.id === id);
    cache = cache.filter((r) => r.id !== id);
    perf.event('Deleted entry', perf.now() - t0);
    emit('remove', { record: rec });
    return rec;
  },
  /** Restore a deleted record (undo). */
  async restore(rec) { await backend.put(rec); cache.push(rec); emit('add', { record: rec }); },
  get(id) { return cache.find((r) => r.id === id); },
  /** Synchronous query against the in-memory mirror (sorted newest first). */
  query({ kind, type, area, since, until } = {}) {
    const s = since ? new Date(since).toISOString() : null;
    const u = until ? new Date(until).toISOString() : null;
    return cache
      .filter((r) => (!kind || r.kind === kind) && (!type || r.type === type) && (!area || r.area === area)
        && (!s || r.createdAt >= s) && (!u || r.createdAt <= u))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  count() { return cache.length; },
  all() { return cache.slice(); },

  async kvGet(key, fallback = null) { const v = await backend.kvGet(key); return v === undefined ? fallback : v; },
  async kvSet(key, value) { await backend.kvSet(key, value); emit('kv', { key }); },
  async kvDel(key) { await backend.kvDel(key); emit('kv', { key }); },

  async exportAll() {
    const kv = await backend.kvAll();
    return { app: 'cbt-toolkit', format: 1, exportedAt: new Date().toISOString(), records: cache.slice(), kv };
  },
  /** Import a backup. mode: 'merge' keeps existing entries; 'replace' wipes first. */
  async importAll(data, mode = 'merge') {
    if (!data || data.app !== 'cbt-toolkit' || !Array.isArray(data.records)) throw new Error('This file is not a CBT Toolkit backup.');
    const t0 = perf.now();
    const clean = data.records.filter((r) => r && typeof r.id === 'string' && typeof r.type === 'string' && typeof r.createdAt === 'string');
    const kv = Array.isArray(data.kv) ? data.kv.filter((k) => k && typeof k.key === 'string') : [];
    if (mode === 'replace') { await backend.clear(); cache = []; }
    await backend.bulk(clean, kv);
    cache = await backend.getAll();
    perf.event(`Imported backup (${mode})`, perf.now() - t0, `${clean.length} entries`);
    emit('import', {});
    return { records: clean.length, kv: kv.length };
  },
  async clearAll() {
    await backend.clear();
    cache = [];
    perf.event('Deleted all local data');
    emit('clear', {});
  },
  async estimate() {
    let usage = null, quota = null;
    try { const e = await navigator.storage.estimate(); usage = e.usage; quota = e.quota; } catch { /* ignore */ }
    const json = JSON.stringify(cache);
    return { usage, quota, recordsBytes: new Blob([json]).size, records: cache.length, backend: this.backendName };
  },
};
