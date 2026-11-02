// Verify the Google integration wiring without live Google credentials:
// catalog includes Gmail/Drive/Sheets, status endpoint works, and using a
// Google tool without a connected account fails with a clear guard.
const BASE = 'http://localhost:3000/api';

async function j(path, init = {}) {
  const headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
  const r = await fetch(BASE + path, { ...init, headers });
  const t = await r.text();
  let data; try { data = JSON.parse(t); } catch { data = t; }
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

// demo sign-in
const login = await j('/auth/demo', { method: 'POST' });
const auth = { Authorization: `Bearer ${login.token}` };
console.log('demo user has google token fields?', 'googleAccessToken' in login.user || 'googleRefreshToken' in login.user ? 'LEAK (bad)' : 'no (ok)');

const apps = await j('/apps', { headers: auth });
const gmail = apps.find(a => a.id === 'gmail');
const drive = apps.find(a => a.id === 'drive');
const gsheets = apps.find(a => a.id === 'gsheets');
console.log('total apps:', apps.length, '| gmail/drive/gsheets present:', !!(gmail&&drive&&gsheets));
console.log('gmail connected (should be false):', gmail?.connected);

const st = await j('/google/status', { headers: auth });
console.log('google status configured/connected:', st.configured, st.connected);

// build a workflow that uses a real Gmail action
const wf = await j('/workflows', {
  method: 'POST', headers: auth,
  body: JSON.stringify({
    name: 'Google guard test',
    description: 'ensures missing google creds fails',
    trigger: { id: 'mailbox.new_email', appId: 'mailbox', config: {} },
    actions: [{ id: 'gmail.send_email', appId: 'gmail', config: { to: 'x@y.z', subject: 'hi', body: 'yo' } }],
    enabled: false,
  }),
});
const run = await j(`/workflows/${wf.id}/test`, { method: 'POST', headers: auth, body: JSON.stringify({ forceSample: true }) });
console.log('guard run status:', run.status);
console.log('guard error:', run.error || '(none)');
const ok = run.status === 'error' && /Google|Connect/i.test(run.error || '');
console.log('guard behaved correctly:', ok);
process.exit(ok ? 0 : 1);
