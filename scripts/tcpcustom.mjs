import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DEMO = join(here, '..', 'server', 'mcp-servers', 'demo-server.mjs');
const BASE = 'http://localhost:3000/api';

const auth = await fetch(BASE + '/auth/demo', { method: 'POST' }).then((r) => r.json());
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` };

const j = async (path, init = {}) => {
  const r = await fetch(BASE + path, { headers: AUTH, ...init });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; }
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(d)}`);
  return d;
};

// 0) The allowlist must reject non-launcher commands (arbitrary execution).
let rejected = false;
try {
  await j('/mcp-servers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Bad', command: 'powershell', args: ['-Command', 'Invoke-Expression 1'] }),
  });
} catch (e) {
  rejected = true;
  console.log('non-allowlisted command rejected ✓');
}
if (!rejected) { console.error('FAIL: powershell was allowed'); process.exit(1); }

// 0b) Eval-style flags must be rejected too.
let rejectedEval = false;
try {
  await j('/mcp-servers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Eval', command: 'node', args: ['-e', 'console.log(1)'] }),
  });
} catch { rejectedEval = true; console.log('eval flag rejected ✓'); }
if (!rejectedEval) { console.error('FAIL: node -e was allowed'); process.exit(1); }

// 1) Register the bundled demo server as a *custom* MCP app over the public API.
const app = await j('/mcp-servers', {
  method: 'POST',
  body: JSON.stringify({ name: 'Custom Demo', command: process.execPath, args: [DEMO] }),
});
console.log('registered custom app:', app.id, '|', app.name, '| tools:', app.steps.length, '| first tool:', app.steps[0]?.id);

// 1b) JSON-Schema-derived fields must exist for real tools.
const slack = app.steps.find((s) => s.id === 'slack.post_message');
console.log('slack tool fields:', slack?.fields?.length, '| labels:', slack?.fields?.map((f) => f.label).join(','));
if (!slack || slack.fields.length < 2 || !slack.fields.some((f) => f.name === 'text' && f.required)) {
  console.error('FAIL: JSON-schema fields not derived');
  process.exit(1);
}

// 2) Confirm it appears in the app catalog as custom.
const apps = await j('/apps');
const custom = apps.find((a) => a.id === app.id);
console.log('custom in /apps:', !!custom, '| custom flag:', custom?.custom);

// 3) Build a workflow that uses the custom app's tool.
const wf = await j('/workflows', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Custom MCP app test',
    trigger: { id: 'mailbox.new_email', appId: 'mailbox', config: {} },
    actions: [{ id: 'slack.post_message', appId: app.id, config: { channel: '#general', text: 'from custom server: {{event.subject}}' } }],
    enabled: false,
  }),
});

// 4) Run it.
const run = await j(`/workflows/${wf.id}/test`, { method: 'POST', body: JSON.stringify({ forceSample: true }) });
console.log('run status:', run.status);
for (const ev of run.steps) for (const s of ev.steps) console.log('  step', `[${s.status}]`, s.label, '->', JSON.stringify(s.output));
if (run.status !== 'success') process.exit(1);

// 5) Remove the custom app.
await j(`/mcp-servers/${app.id}`, { method: 'DELETE' });
console.log('removed custom app, still present?', (await j('/apps')).some((a) => a.id === app.id));
console.log('OK');
