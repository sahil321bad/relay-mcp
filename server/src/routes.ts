import { Router } from 'express';
import { db, uid } from './store';
import { APPS } from './data/seed';
import { runWorkflow } from './lib/engine';
import { requireAuth, loginHandler } from './lib/auth';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'relay-api', time: new Date().toISOString() });
});

// Everything below this line requires a Bearer token (except /auth/login).
router.post('/auth/login', loginHandler);
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Apps
// ---------------------------------------------------------------------------
router.get('/apps', (_req, res) => {
  const conns = db.connections.all();
  const apps = APPS.map((a) => ({
    ...a,
    connected: conns.some((c) => c.appId === a.id),
    connectionCount: conns.filter((c) => c.appId === a.id).length,
  }));
  res.json(apps);
});

router.get('/apps/:id', (req, res) => {
  const app = APPS.find((a) => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'App not found' });
  res.json(app);
});

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------
router.get('/connections', (_req, res) => {
  res.json(db.connections.all());
});

router.post('/connections', (req, res) => {
  const { appId, name, config } = req.body || {};
  if (!appId || !APPS.some((a) => a.id === appId)) {
    return res.status(400).json({ error: 'Invalid appId' });
  }
  const conn = db.connections.insert({
    id: uid('conn'),
    appId,
    name: name || APPS.find((a) => a.id === appId)!.name + ' connection',
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
