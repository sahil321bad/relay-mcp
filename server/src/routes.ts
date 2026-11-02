import { Router } from 'express';
import { db, uid } from './store';
import { getAllApps } from './data/seed';
import { registerMcpServer } from './lib/custom-apps';
import { runWorkflow } from './lib/engine';
import { requireAuth, loginHandler, demoHandler, meHandler, findOrCreateUser, issueSessionToken, issueOneTimeCode, exchangeOneTimeCode } from './lib/auth';
import { listProviders, isConfigured, buildAuthorizeUrl, getProfile, verifyState, consumeState } from './lib/oauth';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'relay-api', time: new Date().toISOString() });
});

// ---------------- Public auth (no token required) ----------------
router.get('/auth/providers', (_req, res) => {
  res.json({ providers: listProviders(), demo: true });
});

router.post('/auth/login', loginHandler);
router.post('/auth/demo', demoHandler);

// OAuth: initiate provider login
router.get('/auth/oauth/:provider', (req, res) => {
  const p = req.params.provider;
  if (p !== 'google' && p !== 'github') return res.status(400).json({ error: 'Unknown provider' });
  if (!isConfigured(p)) {
    return res.status(501).json({ error: `${p} is not configured (set GOOGLE/GITHUB client env vars)` });
  }
  res.redirect(buildAuthorizeUrl(p));
});

// OAuth: provider callback (verifies state, exchanges code, redirects to web app
// with a short-lived one-time code — never the session token).
router.get('/auth/oauth/:provider/callback', async (req, res) => {
  const web = process.env.APP_WEB_URL || 'http://localhost:4173';
  try {
    const p = req.params.provider;
    const state = String(req.query.state || '');
    if (!verifyState(state, p)) throw new Error('Invalid OAuth state (CSRF check failed)');
    const code = String(req.query.code || '');
    if (!code) throw new Error('Missing authorization code');
    const profile = await getProfile(p, code);
    const user = findOrCreateUser(profile);
    const otc = issueOneTimeCode(user.id);
    consumeState(state); // handshake complete → state is now single-use/consumed
    res.redirect(`${web}/login?code=${encodeURIComponent(otc)}`);
  } catch (e: any) {
    res.redirect(`${web}/login?error=${encodeURIComponent(e?.message || 'oauth_failed')}`);
  }
});

// Exchange a one-time code (from the login redirect) for a session token.
router.post('/auth/exchange', (req, res) => {
  const code = String(req.body?.code ?? '');
  const user = exchangeOneTimeCode(code);
  if (!user) return res.status(401).json({ error: 'Invalid or expired code' });
  const token = issueSessionToken(user);
  return res.json({ token, user });
});

// ---------------- Everything below requires auth ----------------
router.use(requireAuth);
router.get('/me', meHandler);

// ---------------------------------------------------------------------------
// Apps
// ---------------------------------------------------------------------------
router.get('/apps', (_req, res) => {
  const conns = db.connections.all();
  const apps = getAllApps().map((a) => ({
    ...a,
    connected: a.custom ? true : conns.some((c) => c.appId === a.id),
    connectionCount: conns.filter((c) => c.appId === a.id).length,
  }));
  res.json(apps);
});

router.get('/apps/:id', (req, res) => {
  const app = getAllApps().find((a) => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'App not found' });
  res.json(app);
});

// ---------------- Custom MCP servers ----------------
router.get('/mcp-servers', (_req, res) => {
  res.json(db.apps.all().filter((a) => (a as any).custom));
});

router.post('/mcp-servers', async (req, res) => {
  const idp = (req as any).user?.provider;
  if (idp !== 'workspace' && idp !== 'demo') {
    return res.status(403).json({ error: 'Only trusted identities may register MCP servers' });
  }
  try {
    const app = await registerMcpServer({
      name: String(req.body?.name || ''),
      command: String(req.body?.command || ''),
      args: Array.isArray(req.body?.args) ? req.body.args.map(String) : [],
    });
    db.apps.insert(app);
    res.status(201).json(app);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to connect MCP server' });
  }
});

router.delete('/mcp-servers/:id', (req, res) => {
  const app = db.apps.get(req.params.id);
  if (!app || !(app as any).custom) return res.status(404).json({ error: 'Not found' });
  db.apps.remove(req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------
router.get('/connections', (_req, res) => {
  res.json(db.connections.all());
});

router.post('/connections', (req, res) => {
  const { appId, name, config } = req.body || {};
  if (!appId || !getAllApps().some((a) => a.id === appId)) {
    return res.status(400).json({ error: 'Invalid appId' });
  }
  const conn = db.connections.insert({
    id: uid('conn'),
    appId,
    name: name || getAllApps().find((a) => a.id === appId)!.name + ' connection',
    config: config || {},
    status: 'connected',
    createdAt: new Date().toISOString(),
  });
  res.status(201).json(conn);
});

router.delete('/connections/:id', (req, res) => {
  const ok = db.connections.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------
function hydrateWorkflow(w: any) {
  return { ...w };
}

router.get('/workflows', (_req, res) => {
  res.json(db.workflows.all().map(hydrateWorkflow));
});

router.post('/workflows', (req, res) => {
  const { name, description, trigger, actions, enabled } = req.body || {};
  if (!name || !trigger || !Array.isArray(actions)) {
    return res.status(400).json({ error: 'name, trigger and actions[] are required' });
  }
  const wf = db.workflows.insert({
    id: uid('wf'),
    name,
    description: description || '',
    trigger,
    actions,
    enabled: enabled ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json(wf);
});

router.get('/workflows/:id', (req, res) => {
  const wf = db.workflows.get(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Not found' });
  res.json(hydrateWorkflow(wf));
});

router.put('/workflows/:id', (req, res) => {
  const wf = db.workflows.get(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Not found' });
  const patch = req.body || {};
  const updated = db.workflows.update(req.params.id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  res.json(updated);
});

router.delete('/workflows/:id', (req, res) => {
  const ok = db.workflows.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.post('/workflows/:id/test', async (req, res) => {
  const wf = db.workflows.get(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Not found' });
  const run = await runWorkflow(wf as any, { forceSample: !!(req.body && req.body.forceSample) });
  res.status(201).json(run);
});

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------
router.get('/runs', (_req, res) => {
  res.json(db.runs.all().sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || '')));
});

router.get('/runs/:id', (req, res) => {
  const run = db.runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});
