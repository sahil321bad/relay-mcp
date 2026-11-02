import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { AppDef, Run, Workflow } from '../types';
import { Badge, Spinner } from '../components/ui';

export default function Home() {
  const [apps, setApps] = useState<AppDef[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.apps(), api.workflows(), api.runs()])
      .then(([a, w, r]) => {
        setApps(a); setWorkflows(w); setRuns(r); setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const successRuns = runs.filter((r) => r.status === 'success').length;
  const connectedApps = apps.filter((a) => a.connected).length;

  if (loading) return <Spinner />;

  const stats = [
    { label: 'MCP apps', value: apps.length, sub: `${connectedApps} connected` },
    { label: 'Workflows', value: workflows.length, sub: `${workflows.filter((w) => w.enabled).length} enabled` },
    { label: 'Runs', value: runs.length, sub: `${successRuns} succeeded` },
  ];

  return (
    <div>
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,.14), rgba(168,85,247,.10))', borderColor: 'var(--border-strong)' }}>
        <div className="row row-between" style={{ alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, letterSpacing: '-0.5px' }}>Welcome to Relay</h1>
            <p className="muted mt8" style={{ margin: '8px 0 0', maxWidth: 560 }}>
              Connect MCP-powered apps and automate the busywork. Trigger on an event, then chain actions across your tools.
            </p>
          </div>
          <Link to="/builder" className="btn btn-primary">+ Create workflow</Link>
        </div>
        <div className="grid grid-3 mt24">
          {stats.map((s) => (
            <div key={s.label} className="card" style={{ background: 'var(--bg-card)' }}>
              <div style={{ fontSize: 30, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              <div className="small muted">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt24">
        <div className="row row-between mb16">
          <h2 style={{ margin: 0, fontSize: 18 }}>Recent workflows</h2>
          <Link to="/workflows" className="btn btn-ghost btn-sm">View all</Link>
        </div>
        {workflows.length === 0 ? (
          <div className="card empty" style={{ padding: '36px' }}>
            <p>No workflows yet — create your first automation.</p>
            <Link to="/builder" className="btn btn-primary">Create workflow</Link>
          </div>
        ) : (
          <div className="grid grid-3">
            {workflows.slice(0, 6).map((w) => (
              <div key={w.id} className="card">
                <div className="row row-between">
                  <span style={{ fontWeight: 700 }}>⚡ {w.name}</span>
                  <Badge tone={w.enabled ? 'green' : 'amber'} dot>{w.enabled ? 'On' : 'Off'}</Badge>
                </div>
                <div className="small muted mt8 mono" style={{ fontSize: 11.5 }}>
                  {w.trigger.id} → {w.actions.map((a) => a.id).join(' → ') || '…'}
                </div>
                <Link to={`/builder?id=${w.id}`} className="btn btn-sm mt16">Edit</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
