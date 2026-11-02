import { readFileSync } from 'node:fs';

const env = readFileSync('server/.env', 'utf8');
const get = (k) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const id = get('GOOGLE_CLIENT_ID');
const secret = get('GOOGLE_CLIENT_SECRET');
console.log('client_id set:', !!id, '| client_secret length:', secret.length, '(not printed)');

const r = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: id,
    client_secret: secret,
    grant_type: 'authorization_code',
    code: '__definitely_invalid_code__',
  }),
});
const d = await r.json().catch(() => ({}));
console.log('token endpoint status:', r.status);
console.log('google_error:', d.error, '|', d.error_description || '');
