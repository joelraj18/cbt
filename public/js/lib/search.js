// Client-side full-text search engine (no server, no third-party service).
// Ranking: BM25F (field-weighted BM25) with Porter stemming, synonym expansion,
// prefix (type-ahead) matching, typo tolerance (Damerau–Levenshtein), phrase queries,
// facet counts and highlighted snippets. Runs entirely in the browser — Cloudflare Pages friendly.
import { stem } from './stemmer.js';

const now = () => (globalThis.performance?.now ? performance.now() : Date.now());

export const STOPWORDS = new Set(('a an and are as at be but by for from has have i if in into is it its me my of on or our so than that the their them then there these they this to was we were what when where which who why will with you your yours how can do does not no yes am im ive also just about more most very really get got make made').split(' '));

const SPELLING = { behaviour: 'behavior', behaviours: 'behaviors', behavioural: 'behavioral', colour: 'color', favour: 'favor', programme: 'program', centre: 'center', judgement: 'judgment', prioritise: 'prioritize', organise: 'organize', realise: 'realize', recognise: 'recognize', minimise: 'minimize', maximise: 'maximize', normalise: 'normalize', visualise: 'visualize', criticise: 'criticize', summarise: 'summarize', apologise: 'apologize', emphasise: 'emphasize', practise: 'practice', defence: 'defense', labelling: 'labeling', catastrophising: 'catastrophizing', catastrophise: 'catastrophize' };

// Everyday words → the vocabulary used in the content. Expansions get a reduced weight.
export const SYNONYMS = {
  sad: ['depression', 'mood'], down: ['depression', 'mood'], blue: ['depression'], hopeless: ['depression', 'hopelessness'], empty: ['depression'], depressed: ['depression'], unhappy: ['depression', 'mood'], miserable: ['depression'],
  worry: ['anxiety', 'worry'], worried: ['anxiety'], nervous: ['anxiety'], panic: ['anxiety', 'panic'], fear: ['anxiety', 'exposure'], scared: ['anxiety', 'fear'], afraid: ['anxiety', 'fear'], stress: ['anxiety', 'stress'], stressed: ['anxiety', 'stress'], tense: ['relaxation', 'anxiety'], phobia: ['exposure', 'anxiety'], overthinking: ['rumination', 'worry'],
  procrastinate: ['procrastination', 'productivity'], lazy: ['procrastination', 'motivation'], unmotivated: ['motivation', 'procrastination'], focus: ['concentration', 'productivity', 'distraction'], distracted: ['distraction', 'focus'], concentrate: ['focus', 'concentration'], pomodoro: ['focus', 'sprint', 'timer'],
  willpower: ['self-control', 'discipline'], discipline: ['self-discipline', 'self-control', 'habit'], consistency: ['habit', 'routine'], routine: ['habit'], temptation: ['self-control', 'temptation'], quit: ['habit', 'urge'],
  schedule: ['planning', 'time'], deadline: ['planning', 'time'], calendar: ['planning', 'schedule'], prioritize: ['priority', 'time'], overwhelmed: ['priority', 'planning', 'stress'], busy: ['time', 'priority'], late: ['planning', 'estimate'],
  libido: ['sexual', 'desire'], sex: ['sexual', 'desire', 'intimacy'], intimacy: ['sexual', 'desire', 'relationship'], arousal: ['sexual', 'desire'], porn: ['pornography', 'urge', 'compulsive'], partner: ['relationship', 'couple'],
  impulsive: ['impulsiveness', 'urge'], urge: ['urge', 'craving'], craving: ['urge', 'craving'], binge: ['urge', 'impulsiveness'], spending: ['impulsiveness', 'urge'], shopping: ['impulsiveness', 'urge'], anger: ['anger', 'impulsiveness'], angry: ['anger'], temper: ['anger'], scrolling: ['phone', 'distraction', 'urge'], adhd: ['impulsiveness', 'attention'],
  sleep: ['sleep', 'insomnia'], insomnia: ['sleep'], tired: ['sleep', 'energy'], breathe: ['breathing'], calm: ['relaxation', 'breathing'], relax: ['relaxation'], exercise: ['physical', 'activity', 'walking'],
  thought: ['thought', 'cognitive'], thinking: ['thought', 'cognitive'], negative: ['thought', 'distortion'], cbt: ['cognitive', 'behavioral', 'therapy'], study: ['research', 'trial'], evidence: ['research', 'meta-analysis'], proof: ['research', 'evidence'],
  lonely: ['social', 'connection'], selfesteem: ['self-criticism', 'compassion'], kind: ['compassion'], guilt: ['self-compassion', 'thought'],
};

export function normalize(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Split into raw word tokens. */
export function words(s) {
  return normalize(s).match(/[a-z0-9]+(?:['’-][a-z0-9]+)*/g) || [];
}

/** Turn a word into its index term (or null if it is a stopword). */
const IZE_ROOTS = new Set(['priorit', 'organ', 'real', 'recogn', 'minim', 'maxim', 'normal', 'visual', 'critic', 'summar', 'apolog', 'emphas', 'catastroph', 'general', 'special', 'energ', 'optim', 'stabil', 'util', 'categor', 'personal', 'custom', 'memor', 'social', 'symbol', 'internal', 'external', 'rational', 'desensit']);

export function term(w) {
  let t = w.replace(/['’]/g, '');
  if (t.includes('-')) t = t.replace(/-/g, '');
  t = SPELLING[t] || t;
  const ize = /^(.+?)is(e|ed|es|ing|ation|ations)$/.exec(t);
  if (ize && IZE_ROOTS.has(ize[1])) t = ize[1] + 'iz' + ize[2];
  if (STOPWORDS.has(t) || (t.length < 2 && !/\d/.test(t))) return null;
  return stem(t);
}

export function tokenize(s) {
  const out = [];
  for (const w of words(s)) {
    const t = term(w);
    if (t) out.push(t);
    if (w.includes('-')) for (const part of w.split('-')) { const p = term(part); if (p && p !== t) out.push(p); }
  }
  return out;
}

/** Damerau–Levenshtein distance with an early-exit bound. */
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

export class SearchEngine {
  constructor({ fields = { title: 3, tags: 2.2, summary: 1.6, body: 1 }, k1 = 1.2, b = 0.75 } = {}) {
    this.fieldBoost = fields;
    this.fields = Object.keys(fields);
    this.k1 = k1; this.b = b;
    this.docs = [];
    this.postings = new Map(); // term -> Map(docIdx -> {field: tf})
    this.fieldLen = [];        // docIdx -> {field: length}
    this.avgLen = {};
    this.vocab = [];
    this.stats = { docs: 0, terms: 0, buildMs: 0, tokens: 0 };
    this.rawWords = new Map(); // term -> most common surface word (for "did you mean")
    this.surface = new Map();  // surface word -> term (for typo tolerance on whole words)
  }

  add(doc) {
    const idx = this.docs.length;
    const text = { title: doc.title || '', tags: (doc.tags || []).join(' '), summary: doc.summary || '', body: doc.body || '' };
    const lens = {};
    for (const f of this.fields) {
      const toks = [];
      for (const w of words(text[f])) {
        const t = term(w);
        if (!t) continue;
        toks.push(t);
        if (!this.rawWords.has(t) && w.length > 2 && !w.includes("'")) this.rawWords.set(t, w);
        if (w.length >= 4 && !this.surface.has(w)) this.surface.set(w, t);
      }
      lens[f] = toks.length;
      this.stats.tokens += toks.length;
      for (const t of toks) {
        let m = this.postings.get(t);
        if (!m) { m = new Map(); this.postings.set(t, m); }
        let e = m.get(idx);
        if (!e) { e = {}; m.set(idx, e); }
        e[f] = (e[f] || 0) + 1;
      }
    }
    this.fieldLen.push(lens);
    this.docs.push({ ...doc, _norm: normalize(`${text.title} ${text.tags} ${text.summary} ${text.body}`) });
    return idx;
  }

  build() {
    const t0 = now();
    const n = this.docs.length || 1;
    for (const f of this.fields) this.avgLen[f] = this.fieldLen.reduce((a, l) => a + (l[f] || 0), 0) / n || 1;
    this.vocab = Array.from(this.postings.keys()).sort();
    this.stats.docs = this.docs.length;
    this.stats.terms = this.vocab.length;
    this.stats.buildMs = now() - t0;
    return this.stats;
  }

  idf(t) {
    const df = this.postings.get(t)?.size || 0;
    const N = this.docs.length;
    return Math.log(1 + (N - df + 0.5) / (df + 0.5));
  }

  prefixTerms(p, limit = 12) {
    const out = [];
    let lo = 0, hi = this.vocab.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.vocab[mid] < p) lo = mid + 1; else hi = mid; }
    for (let i = lo; i < this.vocab.length && out.length < limit; i++) { if (this.vocab[i].startsWith(p)) { if (this.vocab[i] !== p) out.push(this.vocab[i]); } else break; }
    return out;
  }

  /** Typo tolerance: compare the typed word with every indexed surface word (and stems). */
  fuzzyTerms(t, word = t, limit = 3) {
    if (word.length < 4) return [];
    const max = word.length >= 8 ? 2 : 1;
    const best = new Map(); // term -> distance
    const consider = (cand, target, ref) => {
      if (Math.abs(cand.length - ref.length) > max) return;
      const d = editDistance(ref, cand, max);
      if (d <= max && d > 0 && (!best.has(target) || best.get(target) > d)) best.set(target, d);
    };
    for (const [w, tt] of this.surface) consider(w, tt, word);
    for (const v of this.vocab) consider(v, v, t);
    // over-typed words: an indexed stem of ≥6 letters that the typed stem starts with
    if (t.length >= 7) for (const v of this.vocab) if (v.length >= 6 && t.startsWith(v) && !best.has(v)) best.set(v, max);
    return [...best.entries()].filter(([v]) => v !== t && this.postings.has(v))
      .sort((a, b) => a[1] - b[1] || this.postings.get(b[0]).size - this.postings.get(a[0]).size)
      .slice(0, limit).map((x) => x[0]);
  }

  /** Parse a query into weighted term groups. */
  parse(query) {
    const phrases = [];
    const q = String(query || '').replace(/"([^"]+)"/g, (_, p) => { phrases.push(normalize(p).trim()); return ' ' + p + ' '; });
    const raw = words(q);
    const endsWithSpace = /\s$/.test(query || '');
    const groups = [];
    raw.forEach((w, i) => {
      const t = term(w);
      const alts = new Map();
      if (t) alts.set(t, 1);
      const syn = SYNONYMS[w.replace(/[-']/g, '')] || SYNONYMS[SPELLING[w] || w];
      if (syn) for (const s of syn) for (const st of tokenize(s)) if (!alts.has(st)) alts.set(st, 0.55);
      if (!t && !syn) return; // stopword
      const isLast = i === raw.length - 1 && !endsWithSpace;
      groups.push({ word: w, term: t, alts, isLast });
    });
    return { groups, phrases };
  }

  search(query, { kind = null, area = null, limit = 20, offset = 0, prefix = true, fuzzy = true } = {}) {
    const t0 = now();
    const { groups, phrases } = this.parse(query);
    const expanded = [];
    const corrections = [];
    for (const g of groups) {
      const hasExact = g.term && this.postings.has(g.term);
      if (prefix && g.term && (g.isLast || !hasExact) && g.word.length >= 2) {
        for (const p of this.prefixTerms(g.term, g.isLast ? 12 : 6)) if (!g.alts.has(p)) g.alts.set(p, 0.7);
        // the raw word may be a prefix of a longer stem (e.g. "procrast")
        if (g.word !== g.term) for (const p of this.prefixTerms(g.word, 6)) if (!g.alts.has(p)) g.alts.set(p, 0.7);
      }
      if (fuzzy && g.term && !hasExact) {
        const fz = this.fuzzyTerms(g.term, g.word);
        fz.forEach((f, i) => { if (!g.alts.has(f)) g.alts.set(f, i === 0 ? 0.75 : 0.5); });
        if (fz[0]) corrections.push([g.word, this.rawWords.get(fz[0]) || fz[0]]);
      }
      for (const [t, w] of g.alts) if (this.postings.has(t)) expanded.push({ t, w, from: g.word });
    }

    // score
    const scores = new Map();
    const matched = new Map(); // docIdx -> Set(terms)
    const groupHits = new Map(); // docIdx -> Set(group word)
    for (const { t, w, from } of expanded) {
      const idf = this.idf(t);
      for (const [idx, tf] of this.postings.get(t)) {
        let wtf = 0;
        for (const f of this.fields) {
          if (!tf[f]) continue;
          const norm = 1 - this.b + this.b * ((this.fieldLen[idx][f] || 0) / this.avgLen[f]);
          wtf += this.fieldBoost[f] * (tf[f] / norm);
        }
        const s = idf * ((wtf * (this.k1 + 1)) / (wtf + this.k1)) * w;
        scores.set(idx, (scores.get(idx) || 0) + s);
        if (!matched.has(idx)) { matched.set(idx, new Set()); groupHits.set(idx, new Set()); }
        matched.get(idx).add(t);
        groupHits.get(idx).add(from);
      }
    }
    // coordination: reward documents matching more of the query's words; phrases must match
    const nGroups = new Set(groups.map((g) => g.word)).size || 1;
    let hits = [];
    for (const [idx, s] of scores) {
      const doc = this.docs[idx];
      if (phrases.length && !phrases.every((p) => doc._norm.includes(p))) continue;
      const coord = groupHits.get(idx).size / nGroups;
      hits.push({ idx, score: s * (0.35 + 0.65 * coord) * (doc.boost || 1) * (coord === 1 ? 1.15 : 1) });
    }
    if (!groups.length && phrases.length) {
      this.docs.forEach((doc, idx) => { if (phrases.every((p) => doc._norm.includes(p))) hits.push({ idx, score: 1 }); });
    }
    // facets before filtering
    const facets = { kind: {}, area: {} };
    for (const h of hits) {
      const d = this.docs[h.idx];
      facets.kind[d.kind] = (facets.kind[d.kind] || 0) + 1;
      if (d.area) facets.area[d.area] = (facets.area[d.area] || 0) + 1;
    }
    if (kind) hits = hits.filter((h) => this.docs[h.idx].kind === kind);
    if (area) hits = hits.filter((h) => this.docs[h.idx].area === area || (this.docs[h.idx].areas || []).includes(area));
    hits.sort((a, b) => b.score - a.score);
    const total = hits.length;
    const page = hits.slice(offset, offset + limit).map((h) => {
      const doc = this.docs[h.idx];
      const terms = matched.get(h.idx) || new Set();
      return { doc, score: h.score, terms: [...terms], snippet: this.snippet(doc, terms, phrases), titleSegs: highlight(doc.title || '', terms) };
    });
    const ms = now() - t0;
    const didYouMean = total < 3 && corrections.length ? corrections.reduce((q, [from, to]) => q.replace(new RegExp(`\\b${from}\\b`, 'i'), to), String(query)) : null;
    return { results: page, total, ms, facets, expanded: expanded.map((e) => e.t), didYouMean, query };
  }

  /** Best snippet window (as segments [{t, m}]) around matched terms. */
  snippet(doc, terms, phrases = [], width = 190) {
    const text = [doc.summary, doc.body].filter(Boolean).join(' — ').replace(/\s+/g, ' ');
    if (!text) return [];
    const re = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
    const positions = [];
    let m;
    while ((m = re.exec(text))) { const t = term(normalize(m[0])); if (t && terms.has(t)) positions.push(m.index); }
    for (const p of phrases) { const i = normalize(text).indexOf(p); if (i >= 0) positions.push(i); }
    positions.sort((a, b) => a - b);
    let start = 0;
    if (positions.length) {
      let best = positions[0], bestCount = 0;
      for (const p of positions) { const c = positions.filter((q) => q >= p && q < p + width).length; if (c > bestCount) { bestCount = c; best = p; } }
      start = Math.max(0, best - 40);
      while (start > 0 && text[start - 1] !== ' ') start--;
    }
    let end = Math.min(text.length, start + width);
    while (end < text.length && text[end] !== ' ' && end - start < width + 20) end++;
    const segs = highlight(text.slice(start, end), terms);
    if (start > 0) segs.unshift({ t: '… ' });
    if (end < text.length) segs.push({ t: ' …' });
    return segs;
  }
}

/** Split text into [{t, m:boolean}] segments marking words whose stems are in `terms`. */
export function highlight(text, terms) {
  const segs = [];
  const re = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
  let last = 0, m;
  while ((m = re.exec(text))) {
    const t = term(normalize(m[0]));
    if (t && terms.has(t)) {
      if (m.index > last) segs.push({ t: text.slice(last, m.index) });
      segs.push({ t: m[0], m: true });
      last = m.index + m[0].length;
    }
  }
  if (last < text.length) segs.push({ t: text.slice(last) });
  return segs;
}
