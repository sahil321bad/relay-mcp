import type { AppDef, Connection, Run, Workflow } from './types';

const BASE = '/api';

const TOKEN_KEY = 'relay_token';
const SESSION_KEY = 'relay_session';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
const getUserCache = () => JSON.parse(localStorage.getItem('relay_user') || 'null');
export const cachedUser = () => getUserCache();

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('relay_user');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, { headers, ...init });
  if (res.status === 401 && !path.startsWith('/auth/')) {
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

function storeSession(token: string, user?: any) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ at: Date.now() }));
  if (user) localStorage.setItem('relay_user', JSON.stringify(user));
}

export const api = {
  // --- auth ---
  providers: () => req<{ providers: { id: string; label: string; icon: string; configured: boolean }[]; demo: boolean }>('/auth/providers'),
  passwordLogin: (password: string) =>
    req<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
      .then((r) => { storeSession(r.token, r.user); return r; }),
  demoLogin: () =>
    req<{ token: string; user: any }>('/auth/demo', { method: 'POST' })
      .then((r) => { storeSession(r.token, r.user); return r; }),
  oauthStart: (provider: string) => { window.location.href = `${BASE}/auth/oauth/${provider}`; },
  me: () => req<{ user: any }>('/me'),
  /** Handle OAuth redirect: exchange the one-time code for a session token. */
  applyRedirectToken: async () => {
    const q = new URLSearchParams(window.location.search);
    const code = q.get('code');
    const legacy = q.get('token');
    const error = q.get('error');
    if (code) {
      try {
        const r = await req<{ token: string; user: any }>('/auth/exchange', { method: 'POST', body: JSON.stringify({ code }) });
        storeSession(r.token, r.user);
        window.history.replaceState({}, '', '/login');
        window.location.href = '/home';
        return { token: true };
      } catch {
        return { error: 'login_could_not_be_exchanged' };
      }
    }
    if (legacy) {
      storeSession(legacy);
      window.history.replaceState({}, '', '/login');
      window.location.href = '/home';
      return { token: true };
    }
    return { error };
  },

  apps: () => req<AppDef[]>('/apps'),
  app: (id: string) => req<AppDef>(`/apps/${id}`),
  addMcpServer: (body: { name: string; command: string; args: string[] }) =>
    req<AppDef>('/mcp-servers', { method: 'POST', body: JSON.stringify(body) }),
  deleteMcpServer: (id: string) => req<{ ok: boolean }>(`/mcp-servers/${id}`, { method: 'DELETE' }),
  googleStatus: () => req<{ configured: boolean; connected: boolean; user: string }>('/google/status'),

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
