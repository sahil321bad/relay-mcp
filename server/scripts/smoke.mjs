// End-to-end smoke test against a running API.
const BASE = 'http://localhost:3000/api';

async function plain(path, init) {
  const r = await fetch(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...init });
  const t = await r.text();
  let data;
  try { data = JSON.parse(t); } catch { data = t; }
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

// 1) Authentication: login to obtain the bearer token.
const login = await plain('/auth/login', { method: 'POST', body: JSON.stringify({ password: 'relay-demo' }) });
const TOKEN = login.token;
console.log('login ok, token length:', TOKEN.length);

async function j(path, init) {
  const r = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    ...init,
  });
  const t = await r.text();
  let data;
  try { data = JSON.parse(t); } catch { data = t; }
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

// 2) Unauthorized access must be rejected.
const unauth = await fetch(BASE + '/apps');
console.log('unauthenticated /apps ->', unauth.status, '(expected 401)');
if (unauth.status !== 401) throw new Error('auth gate not enforced');

const apps = await j('/apps');
console.log('apps:', apps.length, '| connected:', apps.filter(a => a.connected).length);

// create a workflow: trigger mailbox.new_email -> slack post + sheets add_row
const wf = await j('/workflows', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Smoke: email -> slack + sheets',
    description: 'auto-test',
    trigger: { id: 'mailbox.new_email', appId: 'mailbox', config: {} },
    actions: [
      { id: 'slack.post_message', appId: 'slack', config: { channel: '#general', text: 'New email: {{event.subject}}' } },
      { id: 'sheets.add_row', appId: 'sheets', config: { sheet: 'Leads', values: '{"email":"{{event.from}}","subject":"{{event.subject}}"}' } },
    ],
    enabled: false,
  }),
});
console.log('created workflow:', wf.id, '|', wf.name);

const run = await j(`/workflows/${wf.id}/test`, { method: 'POST', body: JSON.stringify({ forceSample: true }) });
console.log('run status:', run.status);
console.log('events:', run.events.length);
for (const ev of run.steps) {
  for (const s of ev.steps) {
    console.log(`  step [${s.status}] ${s.label} ->`, JSON.stringify(s.output));
  }
}
console.log('logs:');
run.logs.forEach(l => console.log('  ', l.level, '|', l.msg));
if (run.status !== 'success') { console.error('RUN FAILED'); process.exit(1); }
console.log('OK');
