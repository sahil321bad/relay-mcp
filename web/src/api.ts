import type { AppDef, Connection, Run, Workflow } from './types';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  apps: () => req<AppDef[]>('/apps'),
  app: (id: string) => req<AppDef>(`/apps/${id}`),

  connections: () => req<Connection[]>('/connections'),
  createConnection: (body: { appId: string; name?: string; config?: any }) =>
    req<Connection>('/connections', { method: 'POST', body: JSON.stringify(body) }),
  deleteConnection: (id: string) => req<{ ok: boolean }>(`/connections/${id}`, { method: 'DELETE' }),

  workflows: () => req<Workflow[]>('/workflows'),
  createWorkflow: (body: Partial<Workflow>) =>
    req<Workflow>('/workflows', { method: 'POST', body: JSON.stringify(body) }),
  getWorkflow: (id: string) => req<Workflow>(`/workflows/${id}`),
  updateWorkflow: (id: string, body: Partial<Workflow>) =>
    req<Workflow>(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWorkflow: (id: string) => req<{ ok: boolean }>(`/workflows/${id}`, { method: 'DELETE' }),
  testWorkflow: (id: string, forceSample = false) =>
    req<Run>(`/workflows/${id}/test`, { method: 'POST', body: JSON.stringify({ forceSample }) }),

  runs: () => req<Run[]>('/runs'),
  run: (id: string) => req<Run>(`/runs/${id}`),
};
