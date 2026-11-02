// OAuth probe — walks the Google authorize redirect chain to confirm the
// configured client/redirect are accepted. Credentials are loaded from the
// environment or the git-ignored server/.env — never hardcoded.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function envFromFile(key) {
  try {
    const p = join(process.cwd(), 'server', '.env');
    const txt = readFileSync(p, 'utf8');
    const line = txt.split('\n').find((l) => l.trim().startsWith(`${key}=`));
    if (!line) return '';
    return line.slice(line.indexOf('=') + 1).trim();
  } catch {
    return '';
  }
}

const client_id =
  process.env.GOOGLE_CLIENT_ID || envFromFile('GOOGLE_CLIENT_ID') || '';
const base = process.env.APP_BASE_URL || envFromFile('APP_BASE_URL') || 'http://localhost:3000';
const redirect_uri = `${base}/api/auth/oauth/google/callback`;

if (!client_id) {
  console.error('No GOOGLE_CLIENT_ID configured (env or server/.env). Aborting.');
  process.exit(2);
}

const scope = [
  'openid', 'email', 'profile',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');
const q = new URLSearchParams({
  client_id, redirect_uri, response_type: 'code',
  scope, access_type: 'offline', prompt: 'consent', state: 'probe',
});
const start = `https://accounts.google.com/o/oauth2/v2/auth?${q}`;

let current = start;
for (let hop = 0; hop < 8; hop++) {
  const r = await fetch(current, { redirect: 'manual' });
  console.log(`hop ${hop}: status=${r.status} url=${current}`);
  const loc = r.headers.get('location');
  if (!loc) {
    const text = await r.text();
    console.log('FINAL BODY (first 1500):');
    console.log(text.slice(0, 1500));
    break;
  }
  current = new URL(loc, current).toString();
}
