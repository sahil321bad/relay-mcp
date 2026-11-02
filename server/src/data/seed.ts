import { db } from '../store';

// MCP-backed app catalog. Each app maps to a demo MCP server (stdio) and exposes
// a set of trigger/action steps. The `fields` metadata drives the builder UI.
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
  id: string; // also the MCP tool name
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
  mcp: { command: string; args: string[] };
  steps: StepDef[];
  custom?: boolean;
}

export const APPS: AppDef[] = [
  {
    id: 'mailbox',
    name: 'Mailbox',
    tagline: 'Email triggers & send',
    description: 'Read incoming email and send messages from your shared mailbox.',
    category: 'Communication',
    icon: '✉️',
    color: '#f97316',
    mcp: { command: 'node', args: ['mcp-servers/demo-server.mjs'] },
    steps: [
      {
        id: 'mailbox.new_email',
        kind: 'trigger',
        label: 'New Email',
        description: 'Triggers when a new email arrives in the mailbox.',
        fields: [{ name: 'from', label: 'From (substring)', type: 'string', placeholder: 'e.g. alice@acme.io' }],
        sampleOutput: {
          emails: [{ id: 'e1', from: 'alice@acme.io', subject: 'Welcome!', body: 'Hi there', receivedAt: '2025-01-01T00:00:00Z' }],
        },
      },
      {
        id: 'mailbox.send_email',
        kind: 'action',
        label: 'Send Email',
        description: 'Send an email from the mailbox.',
        fields: [
          { name: 'to', label: 'To', type: 'string', required: true, placeholder: 'recipient@example.com' },
          { name: 'subject', label: 'Subject', type: 'string', required: true },
          { name: 'body', label: 'Body', type: 'textarea' },
        ],
        sampleOutput: { ok: true, messageId: 'msg_1' },
      },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    tagline: 'Post to channels',
    description: 'Post messages to Slack channels.',
    category: 'Communication',
    icon: '💬',
    color: '#611f69',
    mcp: { command: 'node', args: ['mcp-servers/demo-server.mjs'] },
    steps: [
      {
        id: 'slack.post_message',
        kind: 'action',
        label: 'Post Message',
        description: 'Send a message to a channel.',
        fields: [
          { name: 'channel', label: 'Channel', type: 'select', required: true, options: [
            { value: '#general', label: '#general' },
            { value: '#sales', label: '#sales' },
            { value: '#support', label: '#support' },
            { value: '#random', label: '#random' },
          ] },
          { name: 'text', label: 'Message text', type: 'textarea', required: true },
        ],
        sampleOutput: { ok: true, ts: 'ts_1' },
      },
    ],
  },
  {
    id: 'sheets',
    name: 'Spreadsheets',
    tagline: 'Rows in & out',
    description: 'Trigger on new rows and write rows to spreadsheets.',
    category: 'Productivity',
    icon: '📊',
    color: '#0f9d58',
    mcp: { command: 'node', args: ['mcp-servers/demo-server.mjs'] },
    steps: [
      {
        id: 'sheets.add_row',
        kind: 'action',
        label: 'Add Row',
        description: 'Append a row to a spreadsheet.',
        fields: [
          { name: 'sheet', label: 'Spreadsheet', type: 'select', required: true, options: [
            { value: 'Contacts', label: 'Contacts' },
            { value: 'Leads', label: 'Leads' },
            { value: 'Orders', label: 'Orders' },
          ] },
          { name: 'values', label: 'Columns → values (JSON)', type: 'textarea', required: true, placeholder: '{"name":"Alice","email":"a@b.io"}' },
        ],
        sampleOutput: { ok: true, rowId: 'row_1' },
      },
      {
        id: 'sheets.new_row',
        kind: 'trigger',
        label: 'New Row',
        description: 'Triggers when a new row is added.',
        fields: [
          { name: 'sheet', label: 'Spreadsheet', type: 'select', required: true, options: [
            { value: 'Contacts', label: 'Contacts' },
            { value: 'Leads', label: 'Leads' },
          ] },
        ],
        sampleOutput: { rows: [{ name: 'Alice', email: 'a@b.io' }] },
      },
    ],
  },
  {
    id: 'weather',
    name: 'Weather',
    tagline: 'Forecasts',
    description: 'Get weather forecasts for a city.',
    category: 'Data',
    icon: '🌤️',
    color: '#1e88e5',
    mcp: { command: 'node', args: ['mcp-servers/demo-server.mjs'] },
    steps: [
      {
        id: 'weather.forecast',
        kind: 'action',
        label: 'Forecast',
        description: 'Get a short weather forecast.',
        fields: [{ name: 'city', label: 'City', type: 'string', required: true, placeholder: 'San Francisco' }],
        sampleOutput: { city: 'san francisco', condition: 'Sunny', tempC: 18 },
      },
    ],
  },
  {
    id: 'http',
    name: 'HTTP Request',
    tagline: 'Call any API',
    description: 'Make outbound HTTP requests (mock echo).',
    category: 'Developer Tools',
    icon: '🔌',
    color: '#0f172a',
    mcp: { command: 'node', args: ['mcp-servers/demo-server.mjs'] },
    steps: [
      {
        id: 'http.request',
        kind: 'action',
        label: 'Request',
        description: 'Make an HTTP request.',
        fields: [
          { name: 'method', label: 'Method', type: 'select', required: true, options: [
            { value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' },
            { value: 'PUT', label: 'PUT' }, { value: 'DELETE', label: 'DELETE' },
          ] },
          { name: 'url', label: 'URL', type: 'string', required: true, placeholder: 'https://api.example.com/v1' },
          { name: 'body', label: 'Body', type: 'textarea' },
        ],
        sampleOutput: { status: 200, data: { echo: {} } },
      },
    ],
  },
  {
    id: 'delay',
    name: 'Delay',
    tagline: 'Utilities',
    description: 'Pause the workflow for a number of seconds.',
    category: 'Utilities',
    icon: '⏱️',
    color: '#64748b',
    mcp: { command: 'node', args: ['mcp-servers/demo-server.mjs'] },
    steps: [
      {
        id: 'delay.run',
        kind: 'action',
        label: 'Delay',
        description: 'Wait a few seconds.',
        fields: [{ name: 'seconds', label: 'Seconds', type: 'number', required: true }],
        sampleOutput: { waited: 1 },
      },
    ],
  },
];

/** Bundled + user-registered (custom) MCP apps. */
export const getAllApps = (): AppDef[] => [
  ...APPS,
  ...(db.apps.all().filter((a) => (a as any).custom) as AppDef[]),
];

export const seedConnections = () => {
  const existing = db.connections.all();
  if (existing.length > 0) return;
  for (const app of APPS) {
    db.connections.insert({
      id: `conn_${app.id}`,
      appId: app.id,
      name: `${app.name} (demo)`,
      status: 'connected',
      createdAt: new Date().toISOString(),
      config: { demo: true },
    });
  }
};
