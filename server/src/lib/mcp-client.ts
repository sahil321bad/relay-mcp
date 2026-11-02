// Thin wrapper around the official MCP SDK. Each "app" is an MCP server run over
// stdio (JSON-RPC). Because all demo apps share the same bundled server, we reuse
// a single client process and dispatch tools by name.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(__dirname, '..', '..');
const SERVER_SCRIPT = join(SERVER_DIR, 'mcp-servers', 'demo-server.mjs');

class McpPool {
  private client: Client | null = null;
  private connecting: Promise<Client> | null = null;

  /** Spawn/attach to the demo MCP server. */
  private async ensure(): Promise<Client> {
    if (this.client) return this.client;
    if (!this.connecting) {
      this.connecting = (async () => {
        const transport = new StdioClientTransport({
          command: process.execPath,
          args: [SERVER_SCRIPT],
          cwd: SERVER_DIR,
          stderr: 'pipe',
        });
        const client = new Client({ name: 'relay-engine', version: '0.1.0' });
        await client.connect(transport);
        this.client = client;
        return client;
      })();
    }
    return this.connecting;
  }

  async listTools(): Promise<any[]> {
    const client = await this.ensure();
    const res = await client.listTools();
    return res.tools;
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    const client = await this.ensure();
    const res = await client.callTool({ name, arguments: args });

    // The SDK flattens a tool's return fields onto the result when no outputSchema
    // is declared. Strip protocol keys and return the remaining fields verbatim.
    if (res.structuredContent !== undefined) {
      return JSON.parse(JSON.stringify(res.structuredContent));
    }
    const SKIP = new Set(['content', 'structuredContent', 'isError', '_meta']);
    const out: Record<string, any> = {};
    for (const k of Object.keys(res)) {
      if (!SKIP.has(k)) out[k] = res[k];
    }
    if (Object.keys(out).length > 0) return out;

    const raw = Array.isArray(res.content) ? res.content.map((c: any) => c.text ?? '').join('\n') : JSON.stringify(res);
    if (raw.trim()) {
      try {
        return JSON.parse(raw);
      } catch { /* fall through */ }
    }
    return { ok: true };
  }
}

export const mcp = new McpPool();
