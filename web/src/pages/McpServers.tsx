import { useEffect, useState } from 'react';
import { api, cachedUser } from '../api';
import type { AppDef, Run } from '../types';
import { AppIcon, Badge, Spinner } from '../components/ui';

const TABS = ['Clients', 'Apps', 'Skills', 'History', 'Settings'] as const;
type Tab = (typeof TABS)[number];

const SKILLS = [
  { name: 'Send an email', desc: 'Compose and send an email via Mailbox.', app: '✉️' },
  { name: 'Post a Slack message', desc: 'Send a message to a channel.', app: '💬' },
  { name: 'Add a spreadsheet row', desc: 'Append rows to Sheets.', app: '📊' },
  { name: 'Get a weather forecast', desc: 'Query Weather for a city.', app: '🌤️' },
  { name: 'Make an HTTP request', desc: 'Call any API endpoint.', app: '🔌' },
];

export default function McpServers() {
  const [tab, setTab] = useState<Tab>('Clients');
  const [apps, setApps] = useState<AppDef[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('MCP Server');
  const [managed, setManaged] = useState(true);
  const [token, setToken] = useState('••••••••');

  useEffect(() => {
    Promise.all([api.apps(), api.runs()])
      .then(([a, r]) => { setApps(a); setRuns(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const user = cachedUser();
  const actionsCount = apps.reduce((n, a) => n + a.steps.filter((s) => s.kind === 'action').length, 0);
  const triggerCount = apps.reduce((n, a) => n + a.steps.filter((s) => s.kind === 'trigger').length, 0);
  const level = (s: string) => (s === 'success' ? 'green' : s === 'error' ? 'red' : 'amber');

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="row row-between mb16">
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>MCP Server</h1>
          <span className="small muted">Model Context Protocol server exposing your apps as tools.</span>
        </div>
        <button className="btn" onClick={() => alert('Share link copied (demo)')}>Share</button>
      </div>

      <div className="tabs mb16">
        {TABS.map((t) => {
          const count = t === 'Clients' ? '1' : t === 'Apps' ? String(apps.length) : t === 'Skills' ? String(SKILLS.length) : t === 'History' ? String(runs.length) : '';
          return (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t} {count && <span className="tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {tab === 'Clients' && (
        <div>
          <div className="row row-between mb16">
            <h3 className="section-title" style={{ margin: 0 }}>Clients connected to this server</h3>
            <button className="btn btn-primary btn-sm" onClick={() => alert('Connect client (demo)')}>+ Connect client</button>
          </div>
          <div className="card table-card">
            <table className="table">
              <thead><tr><th>Client</th><th>Status</th><th>Date added</th></tr></thead>
              <tbody>
                <tr>
                  <td className="row" style={{ gap: 10 }}>
                    <span className="avatar" style={{ width: 28, height: 28 }}>{(user?.name || 'D').slice(0, 2).toUpperCase()}</span>
                    <b>{user?.name || 'Current user'}</b>
                  </td>
                  <td><Badge tone="green" dot>Connected</Badge></td>
                  <td className="small muted">today</td>
                </tr>
                <tr>
                  <td className="row" style={{ gap: 10 }}><span className="app-icon" style={{ width: 28, height: 28, fontSize: 14, background: '#c47f17', margin: 0 }}>C</span><b>Claude</b></td>
                  <td><Badge tone="amber" dot>Pending</Badge> <button className="btn btn-sm" style={{ marginLeft: 8 }}>Finish connecting</button></td>
                  <td className="small muted">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Apps' && (
        <div>
          <div className="row row-between mb16">
            <h3 className="section-title" style={{ margin: 0 }}>Apps exposed as tools ({apps.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => alert('Add app (demo)')}>+ Add apps</button>
          </div>
          <div className="grid grid-2">
            {apps.map((a) => (
              <div key={a.id} className="card row" style={{ gap: 12 }}>
                <AppIcon icon={a.icon} color={a.color} size={40} />
                <div className="flex1">
                  <div style={{ fontWeight: 600 }}>{a.name}</div>
                  <div className="small muted">{a.tagline}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="small mono" style={{ fontWeight: 700 }}>{a.steps.length}</div>
                  <div className="small muted">steps</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Skills' && (
        <div>
          <div className="row row-between mb16">
            <h3 className="section-title" style={{ margin: 0 }}>Skills (tools) available to clients ({SKILLS.length})</h3>
          </div>
          <div className="grid grid-2">
            {SKILLS.map((s) => (
              <div key={s.name} className="card row" style={{ gap: 12 }}>
                <span style={{ fontSize: 22 }}>{s.app}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div className="small muted">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'History' && (
        <div>
          <div className="row row-between mb16">
            <h3 className="section-title" style={{ margin: 0 }}>Execution history</h3>
            <button className="btn btn-sm" onClick={() => alert('History refreshed (demo)')}>Refresh history</button>
          </div>
          <div className="card table-card">
            <table className="table">
              <thead><tr><th>Action</th><th>When</th><th>Status</th></tr></thead>
              <tbody>
                {runs.slice(0, 15).map((r) => (
                  <tr key={r.id}>
                    <td className="row" style={{ gap: 8 }}>
                      <span style={{ fontSize: 16 }}>⚡</span>
                      <span>{r.workflowName || 'Workflow'} · run</span>
                    </td>
                    <td className="small muted">{new Date(r.startedAt).toLocaleString()}</td>
                    <td><Badge tone={level(r.status) as any} dot>{r.status}</Badge></td>
                  </tr>
                ))}
                {runs.length === 0 && <tr><td colSpan={3} className="small muted">No runs yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Settings' && (
        <div className="grid" style={{ maxWidth: 640 }}>
          <div className="card">
            <div className="field">
              <label className="field-label">Server name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="small muted" style={{ marginBottom: 14 }}>Choose the name used to identify this MCP server.</div>

            <div className="field">
              <label className="field-label">Access mode</label>
              <label className="radio-row">
                <input type="radio" checked={managed} onChange={() => setManaged(true)} />
                <span><b>Managed mode</b> — choose which actions your MCP client can run. Each action you turn on becomes a tool.</span>
              </label>
              <label className="radio-row">
                <input type="radio" checked={!managed} onChange={() => setManaged(false)} />
                <span><b>Full access</b> — expose all actions as tools.</span>
              </label>
            </div>
          </div>

          <div className="card">
            <div className="row row-between">
              <div>
                <div style={{ fontWeight: 600 }}>API token</div>
                <div className="small muted">Active {token}</div>
                <div className="small muted">Created Nov 2, 2026</div>
              </div>
              <div className="row">
                <button className="btn btn-sm" onClick={() => { setToken('••••••••'); alert('Token rotated (demo)'); }}>Rotate token</button>
                <button className="btn btn-sm btn-danger" onClick={() => alert('Token revoked (demo)')}>Revoke token</button>
              </div>
            </div>
            <p className="small muted mt16">Some MCP clients (Claude, Cursor, ChatGPT) connect with OAuth and don't need a token. Other clients need an API token.</p>
          </div>

          <div className="card" style={{ borderColor: 'rgba(239,68,68,.35)' }}>
            <div className="row row-between">
              <div>
                <div style={{ color: 'var(--red)', fontWeight: 600 }}>Delete “MCP Server”?</div>
                <div className="small muted">This permanently removes the server and its clients.</div>
              </div>
              <button className="btn btn-danger" onClick={() => alert('Deletion disabled in demo')}>Delete</button>
            </div>
          </div>

          <button className="btn btn-primary" style={{ justifySelf: 'start' }} onClick={() => alert('Settings saved (demo)')}>Save changes</button>
        </div>
      )}
    </div>
  );
}
