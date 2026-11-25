import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptJSON, decryptJSON } from '../public/js/lib/crypto.js';

test('encrypted backups round-trip with the right passphrase and fail with the wrong one', async () => {
  const data = { app: 'cbt-toolkit', format: 1, records: [{ id: 'a', type: 'thought-record', data: { hot: 'I’m useless — ünïcödé ✓' } }], kv: [] };
  const env = await encryptJSON(data, 'correct horse battery');
  assert.equal(env.encrypted, true);
  assert.equal(env.cipher, 'AES-256-GCM');
  assert.ok(!JSON.stringify(env).includes('useless'), 'ciphertext must not contain plaintext');
  assert.deepEqual(await decryptJSON(env, 'correct horse battery'), data);
  await assert.rejects(() => decryptJSON(env, 'wrong passphrase'), /Wrong passphrase/);
});
