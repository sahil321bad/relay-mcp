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
  google?: boolean;
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
  {
    id: 'gmail',
    name: 'Gmail',
    tagline: 'Your real inbox',
    description: 'Send, draft, label, archive and search real Gmail messages (requires Google login).',
    category: 'Google',
    icon: '✉️',
    color: '#EA4335',
    mcp: { command: 'node', args: [] },
    google: true,
    steps: [
      {
        id: 'gmail.new_email',
        kind: 'trigger',
        label: 'New Email',
        description: 'Triggers when new email arrives matching a search query.',
        fields: [{ name: 'query', label: 'Search query (Gmail syntax)', type: 'string', placeholder: 'in:inbox' }],
        sampleOutput: { emails: [{ id: 'e1', from: 'alice@acme.io', subject: 'Welcome!', snippet: 'Hi' }] },
      },
      {
        id: 'gmail.send_email',
        kind: 'action',
        label: 'Send Email',
        description: 'Send a real email from your Gmail account.',
        fields: [
          { name: 'to', label: 'To', type: 'string', required: true },
          { name: 'subject', label: 'Subject', type: 'string', required: true },
          { name: 'body', label: 'Body', type: 'textarea' },
          { name: 'cc', label: 'Cc', type: 'string' },
        ],
        sampleOutput: { ok: true, messageId: 'msg_1' },
      },
      {
        id: 'gmail.create_draft',
        kind: 'action',
        label: 'Create Draft',
        description: 'Create a draft email.',
        fields: [
          { name: 'to', label: 'To', type: 'string', required: true },
          { name: 'subject', label: 'Subject', type: 'string', required: true },
          { name: 'body', label: 'Body', type: 'textarea' },
        ],
        sampleOutput: { ok: true, draftId: 'd1' },
      },
      {
        id: 'gmail.add_label',
        kind: 'action',
        label: 'Add Label',
        description: 'Add a label to a message.',
        fields: [
          { name: 'messageId', label: 'Message ID', type: 'string', required: true, help: 'Use {{event.id}} from the New Email trigger.' },
          { name: 'label', label: 'Label name', type: 'string', required: true },
        ],
        sampleOutput: { ok: true },
      },
      {
        id: 'gmail.archive',
        kind: 'action',
        label: 'Archive Email',
        description: 'Remove a message from the inbox.',
        fields: [{ name: 'messageId', label: 'Message ID', type: 'string', required: true }],
        sampleOutput: { ok: true, archived: true },
      },
      {
        id: 'gmail.delete',
        kind: 'action',
        label: 'Delete Email',
        description: 'Move a message to trash.',
        fields: [{ name: 'messageId', label: 'Message ID', type: 'string', required: true }],
        sampleOutput: { ok: true, trashed: true },
      },
    ],
  },
  {
    id: 'drive',
    name: 'Google Drive',
    tagline: 'Your files',
    description: 'List files and create folders in your real Google Drive.',
    category: 'Google',
    icon: '🗂️',
    color: '#4285F4',
    mcp: { command: 'node', args: [] },
    google: true,
    steps: [
      {
        id: 'drive.list_files',
        kind: 'action',
        label: 'List Files',
        description: 'Search files in Drive.',
        fields: [{ name: 'query', label: 'Query (Drive syntax)', type: 'string', placeholder: "name contains 'invoice'" }],
        sampleOutput: { files: [{ id: 'f1', name: 'invoice.pdf', mimeType: 'application/pdf' }] },
      },
      {
        id: 'drive.create_folder',
        kind: 'action',
        label: 'Create Folder',
        description: 'Create a folder in Drive.',
        fields: [{ name: 'name', label: 'Folder name', type: 'string', required: true }],
        sampleOutput: { id: 'f1', name: 'New folder' },
      },
    ],
  },
  {
    id: 'gsheets',
    name: 'Google Sheets',
    tagline: 'Your Excel online',
    description: 'Read and append rows in your real Google Sheets (Excel).',
    category: 'Google',
    icon: '📊',
    color: '#0F9D58',
    mcp: { command: 'node', args: [] },
    google: true,
    steps: [
      {
        id: 'sheets.append_row',
        kind: 'action',
        label: 'Append Row',
        description: 'Append a row to a spreadsheet (works for Excel-imported sheets).',
        fields: [
          { name: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true, help: 'From the spreadsheet URL: /spreadsheets/d/<ID>/edit' },
          { name: 'range', label: 'Range', type: 'string', placeholder: 'Sheet1!A1' },
          { name: 'values', label: 'Values (JSON column → value)', type: 'textarea', required: true, placeholder: '{"name":"Alice","email":"a@b.io"}' },
        ],
        sampleOutput: { ok: true, updatedRows: 1 },
      },
      {
        id: 'sheets.read_range',
        kind: 'action',
        label: 'Read Range',
        description: 'Read cells from a spreadsheet.',
        fields: [
          { name: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
          { name: 'range', label: 'Range', type: 'string', placeholder: 'Sheet1!A1:C10' },
        ],
        sampleOutput: { values: [['a', 'b', 'c']] },
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
