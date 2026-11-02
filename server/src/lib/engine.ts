// Workflow execution engine. A workflow is { trigger, actions }. Runs poll the
// trigger (an MCP tool), then run each action in order for every emitted event.
// Config fields support template expressions: {{event.<path>}} (trigger output)
// and {{actions.<i>.<path>}} (output of the i-th action).
import { db, uid } from '../store';
import { mcp } from './mcp-client';
import { APPS } from '../data/seed';

export interface WorkflowInput {
  id?: string;
  name: string;
  description?: string;
  trigger: StepConfig;
  actions: StepConfig[];
  enabled: boolean;
}
export interface StepConfig {
  id: string; // step id == MCP tool name
  appId: string;
  config: Record<string, any>;
}

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

function getPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function resolveString(value: string, ctx: { event: any; actions: any[] }): string {
  return value.replace(TOKEN_RE, (_m, path) => {
    const val = getPath(ctx, path) ?? getPath({ event: ctx.event }, path.replace('event.', ''));
    return val == null ? '' : String(val);
  });
}

function resolveValue(value: any, ctx: { event: any; actions: any[] }): any {
  if (value == null) return value;
  if (typeof value === 'string') {
    // Try to parse JSON (e.g. sheets values column map)
    if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        return resolveValue(parsed, ctx);
      } catch { /* fall through to template resolution */ }
    }
    return resolveString(value, ctx);
  }
  if (Array.isArray(value)) return value.map((v) => resolveValue(v, ctx));
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveValue(v, ctx);
    return out;
  }
  return value;
}

function coerceSteps(config: Record<string, any>, fields: any[]): Record<string, any> {
  const out = { ...config };
  for (const f of fields) {
    const v = out[f.name];
    if (v == null) continue;
    if (f.type === 'number') {
      const n = Number(v);
      out[f.name] = Number.isNaN(n) ? v : n;
    } else if (f.type === 'boolean') {
      out[f.name] = v === true || v === 'true';
    }
  }
  return out;
}

/** Pull array of events out of a trigger tool result, or wrap the whole result. */
function extractEvents(result: any): any[] {
  if (result && Array.isArray(result.emails)) return result.emails;
  if (result && Array.isArray(result.rows)) return result.rows;
  if (result && Array.isArray(result.items)) return result.items;
  if (Array.isArray(result)) return result;
  return [result || {}];
}

export async function runWorkflow(workflow: WorkflowInput, opts: { forceSample?: boolean } = {}): Promise<any> {
  const run: any = {
    id: uid('run'),
    workflowId: workflow.id,
    workflowName: workflow.name,
    status: 'running',
    startedAt: new Date().toISOString(),
    logs: [],
    trigger: null,
    events: [],
    steps: [],
  };
  const log = (level: 'info' | 'warn' | 'error', msg: string) => {
    run.logs.push({ level, at: new Date().toISOString(), msg });
  };

  try {
    const triggerApp = APPS.find((a) => a.id === workflow.trigger.appId);
    const triggerStep = triggerApp?.steps.find((s) => s.id === workflow.trigger.id);
    if (!triggerStep) throw new Error(`Unknown trigger step: ${workflow.trigger.id}`);

    log('info', `Polling trigger “${triggerStep.label}” via MCP tool ${workflow.trigger.id}`);

    const triggerArgs = coerceSteps(workflow.trigger.config, triggerStep.fields);
    const triggerResult = await mcp.callTool(workflow.trigger.id, triggerArgs);
    let events = extractEvents(triggerResult);

    if (opts.forceSample || events.length === 0) {
      events = opts.forceSample ? extractEvents(triggerStep.sampleOutput) : events;
      if (events.length > 0) log('warn', opts.forceSample ? 'No live events; ran with sample trigger data.' : 'No new trigger events.');
    }

    run.trigger = { step: workflow.trigger.id, result: triggerResult };
    run.events = events;
    log('info', `Event count: ${events.length}`);

    for (let i = 0; i < events.length && i < 5; i++) {
      const event = events[i];
      const stepLogs: any[] = [];
      const ctx: { event: any; actions: any[] } = { event, actions: [] };

      for (let a = 0; a < workflow.actions.length; a++) {
        const action = workflow.actions[a];
        const app = APPS.find((x) => x.id === action.appId);
        const stepDef = app?.steps.find((s) => s.id === action.id);
        if (!stepDef) throw new Error(`Unknown action step: ${action.id}`);
        const label = stepDef.label ?? action.id;
        stepLogs.push({ stepId: action.id, appId: action.appId, label, status: 'running', output: null });
        log('info', `  → ${label} (${action.id})`);
        const args = resolveValue(coerceSteps(action.config, stepDef.fields), ctx);
        const output = await mcp.callTool(action.id, args);
        ctx.actions.push({ output });
        stepLogs[a].status = 'success';
        stepLogs[a].output = output;
        log('info', `      ok: ${JSON.stringify(output).slice(0, 200)}`);
      }
      run.steps.push({ event, steps: stepLogs });
    }

    run.status = 'success';
    run.finishedAt = new Date().toISOString();
  } catch (err: any) {
    run.status = 'error';
    run.error = err?.message ?? String(err);
    run.finishedAt = new Date().toISOString();
    log('error', String(err?.stack || err?.message || err));
  }

  db.runs.insert(run);
  return run;
}
