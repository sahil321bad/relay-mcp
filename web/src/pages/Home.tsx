import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { AppDef, Run, Workflow } from '../types';
import { Badge, Spinner } from '../components/ui';

export default function Home() {
  const nav = useNavigate();
  const [apps, setApps] = useState<AppDef[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    Promise.all([api.apps(), api.workflows(), api.runs()])
      .then(([a, w, r]) => { setApps(a); setWorkflows(w); setRuns(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const success = runs.filter((r) => r.status === 'success').length;

  return (
    <div>
      {/* Hero / AI prompt */}
      <div className="card hero-card">
        <h1 className="hero-title">What would you like to automate?</h1>
        <div className="prompt-row">
          <span className="badge badge-blue prompt-badge">Ask Relay</span>
          <input
            className="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') nav('/templates'); }}
            placeholder="e.g. Email me when a new lead is added"
          />
          <button className="btn btn-primary" onClick={() => nav('/templates')}>Generate</button>
        </div>
        <div className="row mt16" style={{ flexWrap: 'wrap' }}>
          {['New email → Slack post', 'New lead → Google sheet row', 'Weather → email'].map((t) => (
            <span key={t} className="badge chip" onClick={() => nav('/builder')}>{t}</span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-3 mt24">
        {[
          { label: 'Integrations (MCP apps)', value: apps.length, sub: `${apps.filter((a) => a.connected).length} connected` },
          { label: 'Automations', value: workflows.length, sub: `${workflows.filter((w) => w.enabled).length} live` },
          { label: 'Zap history', value: runs.length, sub: `${success} succeeded` },
        ].map((s) => (
          <div key={s.label} className="card stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="small muted">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div className="mt24">
        <div className="row row-between mb16">
          <h2 className="section-title">Recent automations</h2>
          <Link to="/automations" className="btn btn-ghost btn-sm">View all</Link>
        </div>
        {workflows.length === 0 ? (
          <div className="card empty">
            <p>No automations yet.</p>
            <Link to="/builder" className="btn btn-primary">Create your first</Link>
          </div>
        ) : (
          <div className="grid grid-3">
            {workflows.slice(0, 6).map((w) => (
              <div key={w.id} className="card">
                <div className="row row-between">
                  <span className="wf-name">⚡ {w.name}</span>
                  <Badge tone={w.enabled ? 'green' : 'amber'} dot>{w.enabled ? 'On' : 'Off'}</Badge>
                </div>
                <div className="small muted mono mt8" style={{ fontSize: 11.5 }}>
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
