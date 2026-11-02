import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { Run } from '../types';
import { Badge, EmptyState, Spinner } from '../components/ui';

export default function ZapHistory() {
  const [params] = useSearchParams();
  const highlight = params.get('highlight');
  const wfFilter = params.get('workflow');

  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(highlight);

  useEffect(() => {
    (async () => {
      const all = await api.runs();
      const filtered = wfFilter ? all.filter((r) => r.workflowId === wfFilter) : all;
      setRuns(filtered);
      setOpen(highlight || (filtered[0]?.id ?? null));
      setLoading(false);
    })();
  }, [highlight, wfFilter]);

  if (loading) return <Spinner />;
  if (runs.length === 0) {
    return <div className="card"><EmptyState title="No runs yet" subtitle="Run (test) a workflow to see its execution log here." /></div>;
  }

  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');
  const tone = (s: string) => (s === 'success' ? 'green' : s === 'error' ? 'red' : 'amber');

  return (
    <div>
      <h1 className="page-title">Zap history</h1>
      <div className="grid">
        {runs.map((run) => (
          <div key={run.id} className="card run-card">
            <button className="row row-between" style={{ width: '100%', background: 'none', border: 'none', color: 'inherit', padding: 0 }}
              onClick={() => setOpen(open === run.id ? null : run.id)}>
              <div className="row">
                <span className="run-title">{run.workflowName || 'Workflow'}</span>
                <Badge tone={tone(run.status) as any} dot>{run.status}</Badge>
              </div>
              <span className="small muted mono">{fmt(run.startedAt)}</span>
            </button>

            {open === run.id && (
              <div className="mt16">
                <div className="small muted">Run {run.id} · {run.events.length || 0} event{run.events.length === 1 ? '' : 's'}</div>
                {run.error && (
                  <div className="card mt16" style={{ borderColor: 'rgba(239,68,68,.4)', background: 'rgba(239,68,68,.06)' }}>
                    <div style={{ color: 'var(--red)', fontWeight: 600 }}>Error</div>
                    <div className="small mono" style={{ marginTop: 6 }}>{run.error}</div>
                  </div>
                )}
                <div className="mt16">
                  <div className="step-kicker" style={{ marginBottom: 8 }}>Log</div>
                  <div className="card" style={{ background: 'var(--bg)', padding: 14 }}>
                    {run.logs.map((l, i) => (
                      <div key={i} className="log-line">
                        <span className="log-time">{fmt(l.at)}</span>
                        <span className={`log-msg ${l.level}`}>{l.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {run.steps.map((ev, i) => (
                  <div key={i} className="mt16">
                    <div className="step-kicker" style={{ marginBottom: 8 }}>Event {i + 1}</div>
                    <pre className="pre">{JSON.stringify(ev.event, null, 2)}</pre>
                    <div className="grid mt8">
                      {ev.steps.map((s, j) => (
                        <div key={j} className="card" style={{ padding: 12 }}>
                          <div className="row row-between">
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</span>
                            <Badge tone={tone(s.status) as any} dot>{s.status}</Badge>
                          </div>
                          <pre className="pre mt8">{JSON.stringify(s.output, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
