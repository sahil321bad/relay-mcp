// Drive the REAL backend flow, capture the exact authorize URL it emits, then
// ask Google what it thinks of it.
let cur = 'http://localhost:3000/api/auth/oauth/google';
for (let hop = 0; hop < 6; hop++) {
  const r = await fetch(cur, { redirect: 'manual' });
  const loc = r.headers.get('location');
  console.log(`hop ${hop}: status=${r.status}`);
  console.log(`  ${cur}`);
  if (!loc) {
    console.log('  no redirect; body:', (await r.text()).slice(0, 400));
    break;
  }
  cur = new URL(loc, cur).toString();
}
