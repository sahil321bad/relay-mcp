const base = 'http://localhost:3000/api';

async function read(r) {
  let body;
  try { body = await r.json(); } catch { body = await r.text(); }
  return body;
}

// 1) Authenticate (demo login) to obtain a session token.
let token;
{
  const r = await fetch(base + '/auth/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  const body = await read(r);
  if (!r.ok) {
    console.error('demo login failed', r.status, JSON.stringify(body));
    process.exit(1);
  }
  token = body.token || body.accessToken || body.sessionToken;
  if (!token) {
    console.error('no token in demo login response:', JSON.stringify(body));
    process.exit(1);
  }
}

// 2) Authorized requests.
const headers = { Authorization: `Bearer ${token}` };
for (const p of ['/auth/providers', '/google/status']) {
  const r = await fetch(base + p, { headers });
  const body = await read(r);
  console.log(p, r.status, JSON.stringify(body));
}
