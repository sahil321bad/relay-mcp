// Encrypt/decrypt sensitive credentials (e.g. Google access/refresh tokens) at
// rest using AES-256-GCM. The key comes from env `RELAY_TOKEN_KEY` (hex/base64)
// or, if unset, from a locally generated file `server/data/.token-key`
// (gitignored, 0600) so zero-config dev still stores tokens encrypted.
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from '../store';

function loadKey(): Buffer {
  const fromEnv = process.env.RELAY_TOKEN_KEY;
  if (fromEnv) {
    let buf = Buffer.from(fromEnv, 'hex');
    if (buf.length !== 32) buf = createHash('sha256').update(fromEnv).digest();
    return buf;
  }
  const file = join(DATA_DIR, '.token-key');
  if (existsSync(file)) {
    const buf = Buffer.from(readFileSync(file, 'utf8').trim(), 'hex');
    if (buf.length === 32) return buf;
  }
  const key = randomBytes(32);
  try {
    writeFileSync(file, key.toString('hex'), { mode: 0o600 });
  } catch { /* non-fatal */ }
  return key;
}

const KEY = loadKey();

export function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [v, ivB, tagB, dataB] = payload.split(':');
  if (v !== 'v1' || !ivB || !tagB || !dataB) throw new Error('bad ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8');
}
