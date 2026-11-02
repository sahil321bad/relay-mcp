const r = await fetch('http://localhost:5173/src/main.tsx');
console.log('status', r.status, 'type', r.headers.get('content-type'));
const t = await r.text();
console.log('---- first 500 ----');
console.log(t.slice(0, 500));
