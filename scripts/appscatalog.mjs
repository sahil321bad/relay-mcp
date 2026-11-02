const BASE = 'http://localhost:3000';

const login = await fetch(`${BASE}/api/auth/demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
const loginBody = await login.json().catch(() => ({}));
const token = loginBody.token || loginBody.accessToken || loginBody.session || '';
console.log('login status', login.status, 'keys', Object.keys(loginBody));

const r = await fetch(`${BASE}/api/apps`, { headers: { Authorization: `Bearer ${token}` } });
const t = await r.text();
console.log('apps status', r.status);
let apps;
try { apps = JSON.parse(t); } catch { apps = null; }
if (Array.isArray(apps)) {
  for (const app of apps) {
    if (app.id === 'gmail' || app.id === 'drive') {
      const triggers = app.steps.filter((s) => s.kind === 'trigger');
      const actions = app.steps.filter((s) => s.kind === 'action');
      console.log(`${app.id.toUpperCase()} [google=${app.google} connected=${app.connected}] steps=${app.steps.length} (triggers=${triggers.length}, actions=${actions.length})`);
      for (const s of app.steps) console.log(`   - [${s.kind}] ${s.label} (${s.id})`);
    }
  }
} else {
  console.log('head:', t.slice(0, 300));
}
