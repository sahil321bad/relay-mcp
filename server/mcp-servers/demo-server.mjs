// Demo MCP server — bundles several "apps" as one stdio MCP server exposing
// JSON-RPC tools. Each app's tools are namespaced (mailbox.*, slack.*, ...).
// A shared mock world is persisted to server/data/mock-world.json so that
// separate engine runs see consistent "mailbox / sheet / sent" state.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORLD_FILE = join(__dirname, '..', 'data', 'mock-world.json');

function loadWorld() {
  try {
    return JSON.parse(readFileSync(WORLD_FILE, 'utf8'));
  } catch {
    return { inbox: [], inboxSeen: [], sent: [], sheets: {}, sheetSeen: {}, slack: [] };
  }
}
function saveWorld(world) {
  mkdirSync(dirname(WORLD_FILE), { recursive: true });
  writeFileSync(WORLD_FILE, JSON.stringify(world, null, 2));
}

const server = new McpServer({ name: 'relay-demo-mcp', version: '0.1.0' });

// ---------------------------------------------------------------------------
// Mailbox
// ---------------------------------------------------------------------------
server.registerTool('mailbox.new_email', {
  title: 'New Email',
  description: 'Poll for new incoming emails in the shared mailbox.',
  inputSchema: { from: z.string().optional().describe('Filter by sender (substring)') },
}, async ({ from }) => {
  const world = loadWorld();
  const seen = world.inboxSeen || [];
  const fresh = world.inbox.filter((e) => !seen.includes(e.id) && (!from || e.from.includes(from)));
  world.inboxSeen = [...seen, ...fresh.map((e) => e.id)];
  saveWorld(world);
  return { emails: fresh.slice(0, 20), count: fresh.length };
});

server.registerTool('mailbox.send_email', {
  title: 'Send Email',
  description: 'Send an email from the shared mailbox.',
  inputSchema: {
    to: z.string().describe('Recipient email'),
    subject: z.string().describe('Subject line'),
    body: z.string().describe('Message body'),
  },
}, async ({ to, subject, body }) => {
  const world = loadWorld();
  const messageId = 'msg_' + Date.now();
  world.sent.push({ id: messageId, to, subject, body, at: new Date().toISOString() });
  saveWorld(world);
  return { ok: true, messageId };
});

// ---------------------------------------------------------------------------
// Spreadsheets
// ---------------------------------------------------------------------------
server.registerTool('sheets.new_row', {
  title: 'New Spreadsheet Row',
  description: 'Poll for rows added to a spreadsheet since last poll.',
  inputSchema: { sheet: z.string().default('Contacts') },
}, async ({ sheet }) => {
  const world = loadWorld();
  const key = `sheet:${sheet}`;
  const seen = world.sheetSeen?.[key] || [];
  const rows = (world.sheets[key] || []).filter((r) => !seen.includes(r.__id));
  world.sheetSeen = { ...(world.sheetSeen || {}), [key]: [...seen, ...rows.map((r) => r.__id)] };
  saveWorld(world);
  return { rows: rows.map(({ __id, ...rest }) => rest), count: rows.length };
});

server.registerTool('sheets.add_row', {
  title: 'Add Row',
  description: 'Add a row to a spreadsheet.',
  inputSchema: {
    sheet: z.string().describe('Spreadsheet / table name'),
    values: z.record(z.string(), z.any()).describe('Cell columns → values'),
  },
}, async ({ sheet, values }) => {
  const world = loadWorld();
  const key = `sheet:${sheet}`;
  if (!world.sheets[key]) world.sheets[key] = [];
  const rowId = 'row_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
  world.sheets[key].push({ __id: rowId, ...values });
  saveWorld(world);
  return { ok: true, rowId };
});

// ---------------------------------------------------------------------------
// Slack
// ---------------------------------------------------------------------------
server.registerTool('slack.post_message', {
  title: 'Post Slack Message',
  description: 'Send a message to a Slack channel.',
  inputSchema: {
    channel: z.string().describe('Channel name, e.g. #general'),
    text: z.string().describe('Message text'),
  },
}, async ({ channel, text }) => {
  const world = loadWorld();
  const ts = 'ts_' + Date.now();
  world.slack.push({ channel, text, ts });
  saveWorld(world);
  return { ok: true, ts };
});

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------
server.registerTool('weather.forecast', {
  title: 'Weather Forecast',
  description: 'Get a simple forecast for a city.',
  inputSchema: { city: z.string().describe('City name') },
}, async ({ city }) => {
  const temps = { 'san francisco': 18, 'new york': 24, london: 15, tokyo: 27 };
  const conditions = ['Sunny', 'Partly cloudy', 'Rainy', 'Cloudy'];
  const t = temps[city.toLowerCase()] ?? 20;
  return { city, condition: conditions[Math.floor(Math.random() * conditions.length)], tempC: t };
});

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
server.registerTool('http.request', {
  title: 'HTTP Request',
  description: 'Make an outbound HTTP request (mock echo).',
  inputSchema: {
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
    url: z.string().describe('Request URL'),
    body: z.string().optional(),
  },
}, async ({ method, url, body }) => {
  return { status: 200, data: { echo: { method, url, body }, note: 'mock-http' } };
});

// ---------------------------------------------------------------------------
// Delay
// ---------------------------------------------------------------------------
server.registerTool('delay.run', {
  title: 'Delay',
  description: 'Wait for a number of seconds.',
  inputSchema: { seconds: z.number().min(0).max(10).default(0) },
}, async ({ seconds }) => {
  await new Promise((r) => setTimeout(r, seconds * 1000));
  return { waited: seconds };
});

const transport = new StdioServerTransport();
await server.connect(transport);
