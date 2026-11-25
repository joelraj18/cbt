import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeBackup, cleanValue } from '../public/js/lib/sanitize.js';

const base = { app: 'cbt-toolkit', format: 1 };

test('rejects files that are not backups', () => {
  assert.throws(() => sanitizeBackup({ foo: 1 }), /not a CBT Toolkit backup/);
});

test('drops unknown kinds/types, bad dates and duplicate ids', () => {
  const { data, report } = sanitizeBackup({ ...base, records: [
    { id: 'a', kind: 'exercise', type: 'thought-record', createdAt: '2026-01-01T10:00:00Z', data: {} },
    { id: 'a', kind: 'exercise', type: 'thought-record', createdAt: '2026-01-01T10:00:00Z', data: {} },
    { id: 'b', kind: 'exercise', type: 'not-a-real-exercise', createdAt: '2026-01-01T10:00:00Z' },
    { id: 'c', kind: 'evil', type: 'x', createdAt: '2026-01-01T10:00:00Z' },
    { id: 'd', kind: 'mood', type: 'mood', createdAt: 'not a date' },
    { id: 'e', kind: 'assessment', type: 'phq9', createdAt: '2026-01-02T10:00:00Z', data: { answers: ['1', 2, 'x', null] } },
  ], kv: [{ key: 'tool:habits', value: [] }, { key: 'evil-key', value: 1 }] });
  assert.equal(report.kept, 2);
  assert.equal(report.dropped, 4);
  assert.deepEqual(data.records[1].data.answers, [1, 2, null, null]);
  assert.deepEqual(data.kv.map((k) => k.key), ['tool:habits']);
});

test('coerces numeric fields, strips markup-bearing numbers and recomputes metrics', () => {
  const { data } = sanitizeBackup({ ...base, records: [{ id: 'x', kind: 'exercise', type: 'thought-record', createdAt: '2026-01-01T10:00:00Z',
    data: { after: '<img src=x onerror=alert(1)>', beliefBefore: '80', emotions: [{ name: 'Sad', v: '70' }], traps: ['mind-reading', { evil: 1 }] },
    metrics: { before: '<script>' } }] });
  const r = data.records[0];
  assert.equal(r.data.after, null);
  assert.equal(r.data.beliefBefore, 80);
  assert.deepEqual(r.data.emotions, [{ name: 'Sad', v: 70 }]);
  assert.deepEqual(r.data.traps, ['mind-reading']);
  assert.equal(r.metrics.before, 70);
});

test('removes prototype-polluting keys and caps depth', () => {
  const v = cleanValue(JSON.parse('{"__proto__": {"polluted": true}, "ok": 1, "constructor": 2}'));
  assert.deepEqual(Object.keys(v), ['ok']);
  assert.equal(({}).polluted, undefined);
  let deep = {}; let cur = deep; for (let i = 0; i < 20; i++) { cur.n = {}; cur = cur.n; }
  assert.doesNotThrow(() => cleanValue(deep));
});
