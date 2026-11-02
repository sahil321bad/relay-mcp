// Verifies the OAuth debug endpoint is locked down: unauthenticated -> 401,
// authenticated (workspace Bearer token) -> 200 with config (non-production only).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const tokenFile = join(process.cwd(), 'server', 'data', 'token.json');
let token = '';
try {
  token = JSON.parse(readFileSync(tokenFile, 'utf8')).token || '';
} catch { /* no token file yet */ }

const url = 'http://localhost:3000/api/auth/debug';

const unauth = await fetch(url);
console.log('UNAUTHENTICATED status:', unauth.status);
console.log('  body:', JSON.stringify(await unauth.json()));

const auth = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
console.log('AUTHENTICATED status:', auth.status);
const d = await auth.json();
console.log('  body:', JSON.stringify(d, null, 2));
