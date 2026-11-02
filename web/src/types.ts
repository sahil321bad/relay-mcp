export type FieldType = 'string' | 'number' | 'boolean' | 'select' | 'textarea';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
}

export interface StepDef {
  id: string;
  kind: 'trigger' | 'action';
  label: string;
  description: string;
  fields: FieldDef[];
  sampleOutput: Record<string, any>;
}

export interface AppDef {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  connected?: boolean;
  connectionCount?: number;
  mcp: { command: string; args: string[] };
  steps: StepDef[];
}

export interface Connection {
  id: string;
  appId: string;
  name: string;
  status: string;
  config: Record<string, any>;
  createdAt: string;
}

export interface StepConfig {
  id: string;
  appId: string;
  config: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: StepConfig;
  actions: StepConfig[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RunStep {
  stepId: string;
  appId: string;
  label: string;
  status: 'running' | 'success' | 'error';
  output: any;
}

export interface RunEvent {
  event: any;
  steps: RunStep[];
}

export interface Run {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'success' | 'error';
  startedAt: string;
  finishedAt?: string;
  logs: { level: 'info' | 'warn' | 'error'; at: string; msg: string }[];
  trigger: any;
  events: any[];
  steps: RunEvent[];
  error?: string;
}
