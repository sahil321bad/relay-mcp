import type { AppDef, Connection, Run, Workflow } from './types';

const BASE = '/api';

const TOKEN_KEY = 'relay_token';
const SESSION_KEY = 'relay_session';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, { headers, ...init });
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    logout();
    throw new Error('Session expired');
  }
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
  login: (password: string) =>
    req<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
      .then((r) => {
        localStorage.setItem(TOKEN_KEY, r.token);
        localStorage.setItem(SESSION_KEY, JSON.stringify({ at: Date.now() }));
        return r;
      }),

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
