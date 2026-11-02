const BASE = 'http://localhost:3000/api';
const j = async (path, init) => {
  const r = await fetch(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...init });
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch { d = t; }
  return { status: r.status, data: d };
};

const providers = await j('/auth/providers');
console.log('providers:', providers.status, JSON.stringify(providers.data));
const google = await j('/auth/oauth/google');
console.log('oauth start (unconfigured):', google.status, JSON.stringify(google.data));

const demo = await j('/auth/demo', { method: 'POST' });
console.log('demo login:', demo.status, 'token?', !!demo.data?.token, 'user?', demo.data?.user?.name);
const me = await j('/me', { headers: { Authorization: `Bearer ${demo.data.token}` } });
console.log('/me:', me.status, me.data?.user?.name);
const meBad = await j('/me');
console.log('/me unauthenticated:', meBad.status, '(expected 401)');

const login = await j('/auth/login', { method: 'POST', body: JSON.stringify({ password: 'relay-demo' }) });
console.log('workspace login:', login.status, 'token?', !!login.data?.token);
