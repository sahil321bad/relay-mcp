import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { AppDef, Connection } from '../types';
import { AppIcon, Badge, Modal, Spinner } from '../components/ui';

export default function Apps() {
  const [apps, setApps] = useState<AppDef[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectApp, setConnectApp] = useState<AppDef | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const [mcpOpen, setMcpOpen] = useState(false);
  const [mcpName, setMcpName] = useState('My MCP server');
  const [mcpCmd, setMcpCmd] = useState('');
  const [mcpArgs, setMcpArgs] = useState('');
  const [mcpError, setMcpError] = useState<string | null>(null);

  const [gStatus, setGStatus] = useState<{ configured: boolean; connected: boolean; user: string }>({ configured: false, connected: false, user: '' });

  const refresh = useCallback(async () => {
    const [a, c] = await Promise.all([api.apps(), api.connections()]);
    setApps(a); setConnections(c); setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    api.googleStatus().then(setGStatus).catch(() => {});
  }, []);

  const openConnect = (app: AppDef) => { setConnectApp(app); setName(''); };

  const doConnect = async () => {
    if (!connectApp) return;
    setBusy(true);
    try {
      await api.createConnection({ appId: connectApp.id, name });
      setConnectApp(null);
      await refresh();
    } finally { setBusy(false); }
  };

  const doDisconnect = async (id: string) => { await api.deleteConnection(id); await refresh(); };

  const addMcp = async () => {
    if (!mcpCmd.trim()) { setMcpError('Command is required'); return; }
    setBusy(true); setMcpError(null);
    try {
      const args = mcpArgs.split(',').map((s) => s.trim()).filter(Boolean);
      await api.addMcpServer({ name: mcpName || 'Custom MCP server', command: mcpCmd.trim(), args });
      setMcpOpen(false);
      await refresh();
    } catch (e: any) {
      setMcpError(e?.message || 'Failed to connect');
    } finally { setBusy(false); }
  };

  const removeMcp = async (app: AppDef) => {
    if (!confirm(`Remove MCP server "${app.name}"?`)) return;
    await api.deleteMcpServer(app.id);
    await refresh();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="row row-between mb16">
        <div>
          <h1 className="page-title">App connections</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>Every app is an MCP server (stdio). Connect them to build workflows.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => { setMcpOpen(true); setMcpError(null); }}>+ Add MCP server</button>
        </div>
      </div>

      <div className="card mb16" style={{ borderColor: 'rgba(66,133,244,.35)', background: 'linear-gradient(135deg, rgba(66,133,244,.10), rgba(234,67,53,.06))' }}>
        <div className="row row-between">
          <div className="row" style={{ gap: 12 }}>
            <span style={{ fontSize: 26 }}>🔐</span>
            <div>
              <div style={{ fontWeight: 700 }}>Google integration (Gmail · Drive · Sheets)</div>
              <div className="small muted">
                {gStatus.configured
                  ? gStatus.connected
                    ? `Connected as ${gStatus.user} — real Gmail/Drive/Sheets tools are live.`
                    : 'Configured. Connect your Google account to enable real tools.'
                  : 'Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to enable real Gmail, Drive and Sheets.'}
              </div>
            </div>
          </div>
          {gStatus.configured && !gStatus.connected && (
            <a className="btn btn-primary" href={`/api/auth/oauth/google?returnTo=${encodeURIComponent(window.location.origin)}`}>Connect Google account</a>
          )}
          {gStatus.configured && gStatus.connected && <Badge tone="green" dot>Connected</Badge>}
        </div>
      </div>

      <div className="grid grid-4">
        {apps.map((app) => (
          <div key={app.id} className="card app-card" onClick={() => openConnect(app)}>
            <div className="row row-between">
              <AppIcon icon={app.icon} color={app.color} />
              {app.custom && (
                <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); removeMcp(app); }}>✕</button>
              )}
            </div>
            <div className="app-name">{app.name}</div>
            <div className="app-tagline">{app.custom ? app.tagline : app.tagline}</div>
            <div className="app-meta">
              <Badge tone={app.connected ? 'green' : 'amber'} dot>{app.connected ? 'Connected' : 'Not connected'}</Badge>
              {app.custom && <Badge tone="blue">MCP</Badge>}
            </div>
          </div>
        ))}
      </div>

      <h2 className="section-title" style={{ margin: '32px 0 12px' }}>Connections</h2>
      {connections.length === 0 ? (
        <div className="card empty"><p>No connections yet.</p></div>
      ) : (
        <div className="grid">
          {connections.map((c) => {
            const app = apps.find((a) => a.id === c.appId);
            return (
              <div key={c.id} className="card row row-between">
                <div className="row">
                  {app && <AppIcon icon={app.icon} color={app.color} size={38} />}
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div className="small muted">{app?.name ?? c.appId} · {c.status}</div>
                  </div>
                </div>
                <div className="row">
                  <Badge tone="green" dot>active</Badge>
                  <button className="btn btn-sm btn-danger" onClick={() => doDisconnect(c.id)}>Disconnect</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect modal */}
      <Modal open={!!connectApp} onClose={() => setConnectApp(null)} title={`Connect ${connectApp?.name}`}>
        {connectApp && (
          <div>
            <div className="row mb16">
              <AppIcon icon={connectApp.icon} color={connectApp.color} size={40} />
              <div>
                <div style={{ fontWeight: 600 }}>{connectApp.name}</div>
                <div className="small muted">{connectApp.description}</div>
              </div>
            </div>
            {connectApp.google ? (
              <div>
                <p className="small muted mb16">
                  This is a real Google-powered app. Connect by signing in with your Google account.
                </p>
                <a className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} href={`/api/auth/oauth/google?returnTo=${encodeURIComponent(window.location.origin)}`}>
                  Continue with Google
                </a>
              </div>
            ) : (
              <>
                <div className="field">
                  <label className="field-label">Connection name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={`${connectApp.name} connection`} />
                </div>
                {!connectApp.custom && (
                  <div className="field">
                    <label className="field-label">MCP server</label>
                    <div className="small muted mono" style={{ padding: '10px', background: 'var(--bg)', borderRadius: 10 }}>
                      {connectApp.mcp.command} {connectApp.mcp.args.join(' ')}
                    </div>
                  </div>
                )}
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={doConnect} disabled={busy}>
                  {busy ? 'Connecting…' : 'Connect'}
                </button>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Add MCP server modal */}
      <Modal open={mcpOpen} onClose={() => setMcpOpen(false)} title="Add an MCP server">
        <div className="field">
          <label className="field-label">Name</label>
          <input className="input" value={mcpName} onChange={(e) => setMcpName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label req">Command</label>
          <input className="input" value={mcpCmd} onChange={(e) => setMcpCmd(e.target.value)} placeholder="e.g. npx" />
          <span className="field-help">The program used to launch the MCP server (stdio).</span>
        </div>
        <div className="field">
          <label className="field-label">Arguments (comma separated)</label>
          <input className="input" value={mcpArgs} onChange={(e) => setMcpArgs(e.target.value)} placeholder="e.g. @modelcontextprotocol/server-everything" />
        </div>
        {mcpError && <div className="small" style={{ color: 'var(--red)', marginBottom: 10 }}>{mcpError}</div>}
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={addMcp} disabled={busy}>
          {busy ? 'Connecting…' : 'Discover & add'}
        </button>
      </Modal>
    </div>
  );
}
