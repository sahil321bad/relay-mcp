const base = 'https://roommates-hitting-participants-population.trycloudflare.com';
try {
  const r = await fetch(base + '/api/health');
  console.log('status', r.status);
  console.log(await r.text());
} catch (e) {
  console.error('tunnel fetch failed:', e.message);
}
