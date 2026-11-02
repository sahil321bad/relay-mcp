import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { AppDef, Workflow } from '../types';
import { AppIcon, Badge, EmptyState, Spinner } from '../components/ui';

export default function Automations() {
  const [params] = useSearchParams();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [apps, setApps] = useState<AppDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get('q') || '');
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all');

  const refresh = useCallback(async () => {
    const [w, a] = await Promise.all([api.workflows(), api.apps()]);
    setWorkflows(w); setApps(a); setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const appById = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);

  const filtered = useMemo(() => {
    let list = workflows;
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((w) => w.name.toLowerCase().includes(s) || w.id.toLowerCase().includes(s) || w.trigger.id.toLowerCase().includes(s));
    }
    if (filter === 'on') list = list.filter((w) => w.enabled);
    if (filter === 'off') list = list.filter((w) => !w.enabled);
    return list;
  }, [workflows, q, filter]);

  const toggle = async (w: Workflow) => {
    await api.updateWorkflow(w.id, { enabled: !w.enabled });
    await refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('Move this automation to trash?')) return;
    await api.deleteWorkflow(id);
    await refresh();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="row row-between mb16">
        <h1 className="page-title">Automations</h1>
        <Link to="/builder" className="btn btn-primary">+ Create</Link>
      </div>

      <div className="row mb16" style={{ gap: 10 }}>
        <span className="badge badge-blue">Owner is me <b style={{ cursor: 'pointer' }} onClick={() => {}}>x</b></span>
        <input className="input flex1" style={{ maxWidth: 420 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, ID, or app" />
        <div className="row" style={{ marginLeft: 'auto' }}>
          {(['all', 'on', 'off'] as const).map((f) => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'pill-active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'on' ? 'On' : 'Off'}
            </button>
          ))}
          <button className="btn btn-sm btn-danger" onClick={() => { if (confirm('Trash all filtered?')) alert('No-op (demo)'); }}>Trash</button>
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="card"><EmptyState title="No automations yet" subtitle="Create a workflow to trigger on an event and run actions across your MCP-powered apps." action={<Link to="/builder" className="btn btn-primary">+ Create</Link>} /></div>
      ) : (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr><th style={{ width: 30 }}><input type="checkbox" /></th><th>Name</th><th>Status</th><th>Apps</th><th>Location</th><th /></tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const triggerApp = appById.get(w.trigger.appId);
                const actionApps = w.actions.map((a) => appById.get(a.appId)).filter(Boolean);
                return (
                  <tr key={w.id}>
                    <td><input type="checkbox" /></td>
                    <td><Link to={`/builder?id=${w.id}`} className="table-name">{w.name || 'Untitled automation'}</Link></td>
                    <td><button className={`switch ${w.enabled ? 'on' : ''}`} onClick={() => toggle(w)} title="Toggle"><span className="knob" /></button></td>
                    <td>
                      <span className="row" style={{ gap: 4 }}>
                        {triggerApp && <AppIcon icon={triggerApp.icon} color={triggerApp.color} size={24} />}
                        {actionApps.map((a) => a && <AppIcon key={a.id} icon={a.icon} color={a.color} size={24} />)}
                      </span>
                    </td>
                    <td className="small muted">Personal workspace</td>
                    <td>
                      <span className="row" style={{ justifyContent: 'flex-end' }}>
                        <Link to={`/builder?id=${w.id}`} className="btn btn-ghost btn-sm">Edit</Link>
                        <button className="btn btn-ghost btn-sm" onClick={() => remove(w.id)}>🗑</button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
