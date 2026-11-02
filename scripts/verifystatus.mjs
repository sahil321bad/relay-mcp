const BASE = 'http://localhost:3000';
const login = await fetch(`${BASE}/api/auth/demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
const { token } = await login.json();
const h = { Authorization: `Bearer ${token}` };

const status = await (await fetch(`${BASE}/api/google/status`, { headers: h })).json();
console.log('google/status:', JSON.stringify(status));

const apps = await (await fetch(`${BASE}/api/apps`, { headers: h })).json();
for (const a of apps) {
  if (a.id === 'gmail' || a.id === 'drive' || a.id === 'sheets') {
    console.log(`${a.id}: google=${a.google} connected=${a.connected}`);
  }
}
