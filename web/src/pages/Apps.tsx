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

  const refresh = useCallback(async () => {
    const [a, c] = await Promise.all([api.apps(), api.connections()]);
    setApps(a); setConnections(c); setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openConnect = (app: AppDef) => {
    setConnectApp(app);
    setName('');
  };

  const doConnect = async () => {
    if (!connectApp) return;
    setBusy(true);
    try {
      await api.createConnection({ appId: connectApp.id, name });
      setConnectApp(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const doDisconnect = async (id: string) => {
    await api.deleteConnection(id);
    await refresh();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>Apps</h1>
      <p className="muted" style={{ margin: '0 0 20px' }}>Every app here is an MCP server. Connect them to build workflows.</p>

      <div className="grid grid-4">
        {apps.map((app) => (
          <div key={app.id} className="card app-card" onClick={() => openConnect(app)}>
            <AppIcon icon={app.icon} color={app.color} />
            <div className="app-name">{app.name}</div>
            <div className="app-tagline">{app.tagline}</div>
            <div className="app-meta">
              <Badge tone={app.connected ? 'green' : 'amber'} dot>
                {app.connected ? `Connected` : 'Not connected'}
              </Badge>
              <Badge>{app.steps.filter((s) => s.kind === 'action').length} actions</Badge>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ margin: '36px 0 14px', fontSize: 18 }}>Connections</h2>
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
            <div className="field">
              <label className="field-label">Connection name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={`${connectApp.name} connection`} />
            </div>
            <div className="field">
              <label className="field-label">MCP server</label>
              <div className="small muted mono" style={{ padding: '10px', background: 'var(--bg)', borderRadius: 10 }}>
                {connectApp.mcp.command} {connectApp.mcp.args.join(' ')}
              </div>
              <span className="field-help">Bundled demo MCP server — spawns over stdio (JSON-RPC). Point this at any real MCP server by editing the app config in the API.</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={doConnect} disabled={busy}>
              {busy ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
