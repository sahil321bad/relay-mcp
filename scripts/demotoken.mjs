const r = await fetch('http://localhost:3000/api/auth/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
const d = await r.json();
console.log(d.token);
