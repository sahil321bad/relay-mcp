import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { AppDef, StepConfig, StepDef } from '../types';
import { FieldInput } from '../components/FieldInput';
import { AppIcon, Badge, Modal, Spinner } from '../components/ui';

type ActionEntry = StepConfig & { key: string };

export default function Builder() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const editId = params.get('id');

  const [apps, setApps] = useState<AppDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [wfId, setWfId] = useState<string | undefined>(editId || undefined);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<StepConfig | null>(null);
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [enabled, setEnabled] = useState(false);

  const [picker, setPicker] = useState<null | { mode: 'trigger' | 'action' }>(null);
  const [pickerApp, setPickerApp] = useState<AppDef | null>(null);

  const getApp = useCallback((id: string) => apps.find((a) => a.id === id), [apps]);
  const getStep = useCallback((appId: string, stepId: string) => getApp(appId)?.steps.find((s) => s.id === stepId), [getApp]);

  useEffect(() => {
    (async () => {
      const a = await api.apps();
      setApps(a);
      if (editId) {
        const wf = await api.getWorkflow(editId);
        setName(wf.name);
        setDescription(wf.description || '');
        setTrigger(wf.trigger);
        setActions(wf.actions.map((x, i) => ({ ...x, key: `a${i}_${Date.now()}` })));
        setEnabled(wf.enabled);
      }
      setLoading(false);
    })();
  }, [editId]);

  const openPicker = (mode: 'trigger' | 'action') => {
    setPicker({ mode });
    setPickerApp(null);
  };

  const pickStep = (step: StepDef) => {
    if (!picker || !pickerApp) return;
    if (picker.mode === 'trigger') {
      setTrigger({ id: step.id, appId: pickerApp.id, config: {} });
    } else {
      setActions((prev) => [...prev, { id: step.id, appId: pickerApp.id, config: {}, key: `a${Date.now()}` }]);
    }
    setPicker(null);
  };

  const updateTriggerField = (field: string, value: any) => {
    setTrigger((t) => (t ? { ...t, config: { ...t.config, [field]: value } } : t));
  };

  const updateActionField = (key: string, field: string, value: any) => {
    setActions((prev) => prev.map((a) => (a.key === key ? { ...a, config: { ...a.config, [field]: value } } : a)));
  };

  const removeAction = (key: string) => setActions((prev) => prev.filter((a) => a.key !== key));

  const save = async (): Promise<string | undefined> => {
    if (!name.trim()) { alert('Give your workflow a name'); return; }
    if (!trigger) { alert('Choose a trigger first'); return; }
    setSaving(true);
    try {
      const payload = { name, description, trigger, actions: actions.map(({ key, ...rest }) => rest), enabled };
      if (wfId) {
        await api.updateWorkflow(wfId, payload);
        return wfId;
      }
      const created = await api.createWorkflow(payload);
      setWfId(created.id);
      return created.id;
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    const id = wfId || (await save());
    if (!id) return;
    const run = await api.testWorkflow(id, true);
    nav(`/runs?highlight=${run.id}`);
  };

  if (loading) return <Spinner />;

  const triggerStep = trigger ? getStep(trigger.appId, trigger.id) : undefined;

  return (
    <div className="builder">
      {/* ---------- left: trigger + actions ---------- */}
      <div className="builder-left">
        <div className="row mb16">
          <input className="input" style={{ fontSize: 18, fontWeight: 700, flex: 1 }} value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Name your workflow, e.g. Slack a new lead" />
        </div>
        <input className="input mb16" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)" />

        {/* Trigger */}
        {trigger && triggerStep ? (
          <div className="step-block">
            <div className="step-head">
              <AppIcon icon={getApp(trigger.appId)?.icon || '⚡'} color={getApp(trigger.appId)?.color || '#6366f1'} size={40} />
              <div style={{ flex: 1 }}>
                <div className="step-kicker">1 · Trigger (MCP tool)</div>
                <div className="step-label">{triggerStep.label}</div>
                <div className="step-desc">{triggerStep.description}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setTrigger(null)}>Change</button>
            </div>
            <div className="mt16">
              {triggerStep.fields.map((f) => (
                <FieldInput key={f.name} field={f} value={trigger.config?.[f.name]} onChange={(v) => updateTriggerField(f.name, v)} />
              ))}
              {triggerStep.fields.length === 0 && <p className="small muted">This trigger takes no configuration.</p>}
              <p className="small muted mono" style={{ background: 'var(--bg)', padding: 10, borderRadius: 10 }}>
                💡 Reference trigger output in actions with <b>{'{{event.…}}'}</b> (e.g. {'{{event.subject}}'}).
              </p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ borderStyle: 'dashed', textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 30 }}>⚡</div>
            <h3 style={{ margin: '10px 0 4px' }}>Choose a trigger</h3>
            <p className="small muted" style={{ margin: '0 0 14px' }}>Every workflow starts with an event from an MCP app.</p>
            <button className="btn btn-primary" onClick={() => openPicker('trigger')}>Choose trigger app</button>
          </div>
        )}

        {/* Actions */}
        <div className="mt24">
          <div className="step-kicker" style={{ marginBottom: 10 }}>2 · Actions (run in order)</div>
          {actions.map((a, i) => {
            const app = getApp(a.appId);
            const step = getStep(a.appId, a.id);
            if (!app || !step) return null;
            return (
              <div key={a.key} className="step-block">
                <div className="step-head">
                  <AppIcon icon={app.icon} color={app.color} size={40} />
                  <div style={{ flex: 1 }}>
                    <div className="step-kicker">Action {i + 1}</div>
                    <div className="step-label">{step.label}</div>
                    <div className="step-desc">{app.name} · {step.description}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeAction(a.key)}>Remove</button>
                </div>
                <div className="mt16">
                  {step.fields.map((f) => (
                    <FieldInput key={f.name} field={f} value={a.config?.[f.name]} onChange={(v) => updateActionField(a.key, f.name, v)} />
                  ))}
                  {step.fields.length === 0 && <p className="small muted">This action takes no configuration.</p>}
                </div>
              </div>
            );
          })}
          <button className="add-step" onClick={() => openPicker('action')}>
            + Add an action
          </button>
        </div>
      </div>

      {/* ---------- right: summary / actions ---------- */}
      <div className="builder-right">
        <div className="card" style={{ position: 'sticky', top: 90 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Workflow summary</div>
          <div className="small muted" style={{ marginBottom: 8 }}>Trigger</div>
          <div className="card" style={{ padding: 12, background: 'var(--bg)' }}>
            {trigger ? (
              <span className="badge badge-blue"><span className="badge-dot" /> {triggerStep?.label ?? trigger.id}</span>
            ) : <span className="muted">— not chosen —</span>}
          </div>
          <div className="small muted" style={{ margin: '12px 0 8px' }}>Actions</div>
          <div className="card" style={{ padding: 12, background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {actions.length === 0 && <span className="muted small">— none —</span>}
            {actions.map((a, i) => {
              const step = getStep(a.appId, a.id);
              return <span key={a.key} className="badge"><span className="badge-dot" style={{ background: 'var(--accent)' }} /> {i + 1}. {step?.label ?? a.id}</span>;
            })}
          </div>

          <div className="row row-between mt16">
            <span className="small muted">Enable workflow</span>
            <button className="btn btn-sm" style={{ minWidth: 56, textAlign: 'center' }} onClick={() => setEnabled(!enabled)}>
              {enabled ? 'On' : 'Off'}
            </button>
          </div>

          <div className="row mt16" style={{ flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : wfId ? 'Save workflow' : 'Create workflow'}
            </button>
            <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={test}>
              ▶ Test with sample trigger
            </button>
            {wfId && <Link className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }} to="/workflows">← Back to workflows</Link>}
          </div>
        </div>
      </div>

      {/* ---------- picker modal ---------- */}
      <Modal open={!!picker} onClose={() => setPicker(null)} title={picker?.mode === 'trigger' ? 'Choose a trigger' : 'Add an action'}>
        {!pickerApp ? (
          <div className="grid">
            {apps.map((app) => {
              const hasSteps = app.steps.some((s) => s.kind === picker?.mode);
              if (!hasSteps) return null;
              return (
                <div key={app.id} className="card row" style={{ cursor: 'pointer', padding: 14 }} onClick={() => setPickerApp(app)}>
                  <AppIcon icon={app.icon} color={app.color} size={38} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{app.name}</div>
                    <div className="small muted">{app.tagline}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="row mb16">
              <AppIcon icon={pickerApp.icon} color={pickerApp.color} size={38} />
              <div className="flex1"><b>{pickerApp.name}</b><div className="small muted">{pickerApp.description}</div></div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPickerApp(null)}>← Apps</button>
            </div>
            <div className="grid">
              {pickerApp.steps.filter((s) => s.kind === picker?.mode).map((s) => (
                <div key={s.id} className="card" style={{ cursor: 'pointer', padding: 14 }} onClick={() => pickStep(s)}>
                  <div className="row row-between">
                    <b>{s.label}</b>
                    <Badge tone={s.kind === 'trigger' ? 'blue' : 'green'}>{s.kind === 'trigger' ? 'trigger' : 'action'}</Badge>
                  </div>
                  <div className="small muted mt8">{s.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
