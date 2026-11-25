// Optional passphrase encryption for backup files (Web Crypto: PBKDF2-SHA-256 → AES-256-GCM).
// The passphrase never leaves the browser and is never stored.

const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ITER = 310000;

async function deriveKey(passphrase, salt, iter = ITER) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptJSON(obj, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  // chunked base64 to avoid call-stack limits on large backups
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))));
  let bin = '';
  for (let i = 0; i < data.length; i += 0x8000) bin += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return { app: 'cbt-toolkit', encrypted: true, kdf: 'PBKDF2-SHA256', iterations: ITER, cipher: 'AES-256-GCM', salt: b64(salt), iv: b64(iv), data: btoa(bin) };
}

export async function decryptJSON(envelope, passphrase) {
  const key = await deriveKey(passphrase, unb64(envelope.salt), envelope.iterations || ITER);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(envelope.iv) }, key, unb64(envelope.data));
    return JSON.parse(dec.decode(plain));
  } catch {
    throw new Error('Wrong passphrase, or the file is damaged.');
  }
}
