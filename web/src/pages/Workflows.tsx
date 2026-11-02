import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Workflow } from '../types';
import { Badge, EmptyState, Spinner } from '../components/ui';

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setWorkflows(await api.workflows());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (wf: Workflow) => {
    await api.updateWorkflow(wf.id, { enabled: !wf.enabled });
    await refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    await api.deleteWorkflow(id);
    await refresh();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="row row-between mb16">
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Workflows</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>{workflows.length} workflow{workflows.length === 1 ? '' : 's'} in your workspace</p>
        </div>
        <Link to="/builder" className="btn btn-primary">+ New workflow</Link>
      </div>

      {workflows.length === 0 ? (
        <div className="card">
          <EmptyState title="No workflows yet" subtitle="Get started by connecting two apps with a trigger and an action."
            action={<Link to="/builder" className="btn btn-primary">Create your first workflow</Link>} />
        </div>
      ) : (
        <div className="grid">
          {workflows.map((wf) => (
            <div key={wf.id} className="card">
              <div className="row row-between">
                <div className="row" style={{ gap: 12 }}>
                  <div style={{ fontSize: 26 }}>⚡</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{wf.name}</div>
                    <div className="small mono muted" style={{ fontSize: 11.5, marginTop: 3 }}>
                      {wf.trigger.id} → {wf.actions.map((a) => a.id).join(' → ') || '…'}
                    </div>
                  </div>
                </div>
                <Badge tone={wf.enabled ? 'green' : 'amber'} dot>{wf.enabled ? 'On' : 'Off'}</Badge>
              </div>
              {wf.description && <p className="small muted mt8" style={{ margin: '8px 0 0' }}>{wf.description}</p>}
              <div className="row mt16">
                <Link to={`/builder?id=${wf.id}`} className="btn btn-sm">Edit</Link>
                <button className="btn btn-sm" onClick={() => toggle(wf)}>{wf.enabled ? 'Turn off' : 'Turn on'}</button>
                <Link to={`/runs?workflow=${wf.id}`} className="btn btn-ghost btn-sm">Runs</Link>
                <button className="btn btn-sm btn-danger" style={{ marginLeft: 'auto' }} onClick={() => remove(wf.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
