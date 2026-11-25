import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SearchEngine, tokenize, editDistance, highlight } from '../public/js/lib/search.js';
import { stem } from '../public/js/lib/stemmer.js';
import { EXERCISES } from '../public/js/data/exercises/index.js';
import { research } from '../public/js/data/research.js';

function engine() {
  const e = new SearchEngine();
  EXERCISES.forEach((x) => e.add({ id: 'ex:' + x.id, kind: 'exercise', area: x.area, title: x.title, tags: [x.tagline], summary: x.simple, body: [x.why, ...x.steps].join(' ') }));
  research.forEach((r) => e.add({ id: 'ref:' + r.id, kind: 'research', area: r.areas[0], title: r.title, tags: [r.type, ...r.areas], summary: r.simple, body: r.finding }));
  e.build();
  return e;
}
const E = engine();
const top = (q, opts) => E.search(q, { limit: 5, ...opts }).results.map((r) => r.doc.id);

test('Porter stemmer conflates word forms', () => {
  assert.equal(stem('worrying'), stem('worries'));
  assert.equal(stem('relaxation'), 'relax');
  assert.equal(stem('relaxing'), 'relax');
  assert.equal(stem('habits'), 'habit');
});

test('tokenizer removes stopwords, normalises UK spelling and splits hyphens', () => {
  const t = tokenize('The behaviour of self-compassion when prioritising');
  assert.ok(t.includes('behavior'));
  assert.ok(t.includes('compass'));
  assert.ok(!t.includes('the'));
  assert.deepEqual(tokenize('prioritising'), tokenize('prioritizing'));
});

test('Damerau-Levenshtein handles transpositions', () => {
  assert.equal(editDistance('anxeity', 'anxiety'), 1);
  assert.equal(editDistance('worry', 'worry'), 0);
  assert.ok(editDistance('sleep', 'exposure', 2) > 2);
});

test('index statistics are populated', () => {
  assert.equal(E.stats.docs, EXERCISES.length + research.length);
  assert.ok(E.stats.terms > 1500);
});

test('relevant results rank first', () => {
  assert.equal(top('urge surfing')[0], 'ex:urge-surfing');
  assert.equal(top('thought record')[0], 'ex:thought-record');
  assert.ok(top('fear ladder exposure').slice(0, 3).includes('ex:fear-ladder'));
  assert.ok(top('habit 66 days').includes('ref:lally2010'));
});

test('typo tolerance and did-you-mean', () => {
  assert.ok(E.search('procrastinaton').total > 0);
  assert.ok(E.search('anxeity').total > 0);
  assert.ok(E.search('mindfulnes').results.some((r) => /mindful/i.test(r.doc.title + r.doc.summary)));
});

test('everyday synonyms map to clinical vocabulary', () => {
  assert.ok(E.search('libido').results.some((r) => r.doc.area === 'sexual-desire'));
  assert.ok(E.search('lazy').results.some((r) => r.doc.area === 'productivity'));
  assert.ok(E.search('worried').results.some((r) => r.doc.area === 'anxiety'));
});

test('prefix (type-ahead) matching', () => {
  assert.ok(E.search('procras').total > 0);
  assert.ok(E.search('mindf').total > 0);
});

test('phrase queries must match exactly', () => {
  const r = E.search('"temptation bundling"');
  assert.ok(r.total >= 2);
  r.results.forEach((x) => assert.match((x.doc.title + ' ' + x.doc.summary + ' ' + x.doc.body).toLowerCase(), /temptation bundling/));
});

test('facets and filters', () => {
  const all = E.search('sleep', { limit: 100 });
  assert.ok(all.facets.kind.research > 0 && all.facets.kind.exercise > 0);
  const only = E.search('sleep', { kind: 'research', limit: 100 });
  assert.ok(only.results.every((r) => r.doc.kind === 'research'));
  const area = E.search('thought', { area: 'anxiety', limit: 100 });
  assert.ok(area.results.every((r) => r.doc.area === 'anxiety' || (r.doc.areas || []).includes('anxiety')));
});

test('snippets and highlights mark matched words', () => {
  const r = E.search('rumination').results[0];
  assert.ok(r.snippet.some((s) => s.m));
  const segs = highlight('Worrying about worries', new Set([stem('worry')]));
  assert.equal(segs.filter((s) => s.m).length, 2);
});

test('search is fast (well under 50 ms per query)', () => {
  const t0 = performance.now();
  for (const q of ['worry', 'sleep habit', 'procrastination plan', 'exposure fear ladder', 'desire']) E.search(q);
  assert.ok((performance.now() - t0) / 5 < 50);
});
