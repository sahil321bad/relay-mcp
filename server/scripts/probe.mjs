import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(__dirname, '..');
const script = join(SERVER_DIR, 'mcp-servers', 'demo-server.mjs');

const transport = new StdioClientTransport({ command: process.execPath, args: [script], cwd: SERVER_DIR });
const client = new Client({ name: 'probe', version: '1.0.0' });
await client.connect(transport);

const tools = await client.listTools();
console.log('tool names:', tools.tools.map(t => t.name));

const res = await client.callTool({ name: 'mailbox.send_email', arguments: { to: 'a@b.io', subject: 'hi', body: 'yo' } });
console.log('res keys:', Object.keys(res));
console.log('content:', JSON.stringify(res.content, null, 2));
console.log('structuredContent:', JSON.stringify(res.structuredContent, null, 2));
await client.close();
