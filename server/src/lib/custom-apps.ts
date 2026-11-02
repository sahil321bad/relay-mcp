// Register a user-supplied MCP server (stdio) as a first-class app: we spawn it,
// list its tools, and convert each tool into a builder step with fields derived
// from the tool's input schema.
//
// Security:
//  - Launcher commands are restricted to an allowlist (npx/node/npm/...).
//  - argv tokens are validated (non-empty, no interpreter/eval-style flags).
//  - The route additionally requires a trusted identity (workspace/demo).
import { z } from 'zod';
import { mcp } from './mcp-client';
import { uid } from '../store';
import type { AppDef, FieldDef, StepDef } from '../data/seed';

const ALLOWED_COMMANDS = (process.env.MCP_ALLOWED_COMMANDS || 'node,npx,npm,pnpm,yarn,deno,uvx')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Flags that turn a launcher into an arbitrary-code interpreter.
const EVAL_FLAGS = new Set(['-e', '--eval', '-p', '--print', '-c', '--command', '-i']);

function validateCfg(cfg: { command: string; args: string[] }) {
  let base = cfg.command.split(/[\\/]/).pop()?.toLowerCase() || '';
  if (base.endsWith('.exe')) base = base.slice(0, -4); // Windows executable
  if (!ALLOWED_COMMANDS.includes(base)) {
    throw new Error(`Launcher "${cfg.command}" is not allowed. Allowed: ${ALLOWED_COMMANDS.join(', ')}`);
  }
  if (!cfg.args.length) throw new Error('At least one argument (the server) is required');
  for (const a of cfg.args) {
    if (typeof a !== 'string' || !a.trim()) throw new Error('Invalid argument (empty)');
    if (EVAL_FLAGS.has(a) || /^--[^=]+=/.test(a)) {
      throw new Error(`Argument "${a}" is not allowed`);
    }
  }
}

// ---------------------------------------------------------------------------
// Tool → builder field conversion.
// MCP transports `inputSchema` as plain JSON Schema ({ type:'object', properties,
// required }). Some in-process SDK paths hand us a zod object; we support both,
// preferring JSON Schema.
// ---------------------------------------------------------------------------
function jsonFields(schema: any): FieldDef[] {
  if (!schema || typeof schema !== 'object' || schema.type !== 'object' || !schema.properties) return [];
  const required: string[] = Array.isArray(schema.required) ? schema.required : [];
  const fields: FieldDef[] = [];
  for (const [key, prop] of Object.entries(schema.properties)) {
    const p: any = prop || {};
    const t = Array.isArray(p.type) ? p.type[0] : p.type;
    let type: FieldDef['type'] = 'string';
    let options: FieldDef['options'];
    if (Array.isArray(p.enum)) {
      type = 'select';
      options = p.enum.map((v: any) => ({ value: String(v), label: String(v) }));
    } else if (t === 'number' || t === 'integer') {
      type = 'number';
    } else if (t === 'boolean') {
      type = 'boolean';
    } else if (t === 'array') {
      type = 'textarea';
    }
    fields.push({
      name: key,
      label: (p.title || key).replace(/_/g, ' '),
      type,
      required: required.includes(key),
      placeholder: typeof p.description === 'string' ? p.description : undefined,
      options,
    });
  }
  return fields;
}

function zodFields(schema: any): FieldDef[] {
  const shape = schema?.shape;
  if (!shape) return [];
  const fields: FieldDef[] = [];
  for (const [key, sub] of Object.entries(shape)) {
    const subAny: any = sub;
    let type: FieldDef['type'] = 'string';
    if (subAny instanceof z.ZodNumber) type = 'number';
    else if (subAny instanceof z.ZodBoolean) type = 'boolean';
    const required = !(typeof subAny?.isOptional === 'function' && subAny.isOptional());
    fields.push({ name: key, label: key.replace(/_/g, ' '), type, required });
  }
  return fields;
}

function toolFields(tool: any): FieldDef[] {
  const s = tool?.inputSchema;
  const fromJson = jsonFields(s);
  if (fromJson.length) return fromJson;
  return zodFields(s);
}

export async function registerMcpServer(input: { name: string; command: string; args: string[] }): Promise<AppDef> {
  const cfg = { command: input.command, args: (input.args || []).map(String).filter(Boolean) };
  validateCfg(cfg);

  const tools = await mcp.listTools(cfg);
  if (!tools.length) throw new Error('MCP server exposed no tools');

  const steps: StepDef[] = tools.map((t) => ({
    id: t.name,
    kind: 'action',
    label: t.title || t.name,
    description: t.description || '',
    fields: toolFields(t),
    sampleOutput: {},
  }));

  const app: AppDef = {
    id: `mcp_${uid('').slice(0, 14)}`,
    name: input.name || 'Custom MCP server',
    tagline: `${tools.length} tools`,
    description: 'User-registered MCP server (stdio)',
    category: 'Custom MCP',
    icon: '🛰️',
    color: '#7c3aed',
    mcp: cfg,
    steps,
    custom: true,
  };
  return app;
}
