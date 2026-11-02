const BASE = 'http://localhost:3000';
const r = await fetch(`${BASE}/api/auth/oauth/google`, { redirect: 'manual' });
console.log('status:', r.status);
console.log('location:', r.headers.get('location'));
const text = await r.text();
console.log('body head:', text.slice(0, 300).replace(/\s+/g, ' '));
