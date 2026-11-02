const id = process.argv[2] || 'run_1793640351353_z7eit';
const r = await fetch('http://localhost:3000/api/runs/' + id);
console.log('status', r.status);
const run = await r.json();
console.log(JSON.stringify(run, null, 2));
