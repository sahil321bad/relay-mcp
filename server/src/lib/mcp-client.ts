// Thin wrapper around the official MCP SDK. Each "app" is an MCP server run over
// stdio (JSON-RPC). We keep a pool of client processes keyed by their command/args,
// so custom MCP servers (as well as the bundled demo server) can be attached.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(__dirname, '..', '..');
const SERVER_SCRIPT = join(SERVER_DIR, 'mcp-servers', 'demo-server.mjs');

export interface McpCfg {
  command: string;
  args: string[];
}

class McpPool {
  private clients = new Map<string, Client>();
  private connecting = new Map<string, Promise<Client>>();

  private key(cfg: McpCfg) {
    return `${cfg.command}|${cfg.args.join(' ')}`;
  }

  private async connect(cfg: McpCfg): Promise<Client> {
    const k = this.key(cfg);
    const existing = this.clients.get(k);
    if (existing) return existing;
    if (!this.connecting.has(k)) {
      this.connecting.set(
        k,
        (async () => {
          const transport = new StdioClientTransport({
            command: cfg.command,
            args: cfg.args,
            cwd: SERVER_DIR,
            stderr: 'pipe',
          });
          const client = new Client({ name: 'relay-engine', version: '0.1.0' });
          await client.connect(transport);
          this.clients.set(k, client);
          return client;
        })(),
      );
    }
    return this.connecting.get(k)!;
  }

  async listTools(cfg: McpCfg): Promise<any[]> {
    const client = await this.connect(cfg);
    const res = await client.listTools();
    return res.tools;
  }

  async callTool(cfg: McpCfg, name: string, args: Record<string, any>): Promise<any> {
    const client = await this.connect(cfg);
    const res = await client.callTool({ name, arguments: args });

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

  /** Demo server (bundled) helper. */
  get demoCfg(): McpCfg {
    return { command: process.execPath, args: [SERVER_SCRIPT] };
  }
}

export const mcp = new McpPool();
