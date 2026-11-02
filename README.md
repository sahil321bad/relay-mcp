# Relay — Automation platform powered by MCP

A Zapier-style automation platform built from scratch, where **apps are MCP servers**
(Model Context Protocol). Users connect MCP-backed apps, build trigger→action workflows,
and watch them run — all through a web UI.

```
┌──────────────────────────────┐
│  Web UI (React + Vite)       │
└──────────────┬───────────────┘
               │ REST API
┌──────────────▼───────────────┐
│  API + Workflow Engine        │────┐
│  (Node / Express / TS)        │    │ MCP stdio client
└──────────────┬───────────────┘    │
               │                    │
   ┌───────────▼───────────────┐    │
   │ MCP Servers (local demo)  │◄───┘
   │  mailbox, slack, sheets,  │
   │  weather, http, delay     │
   └───────────────────────────┘
```

## Features
- **Apps directory** — MCP-backed integrations, each exposing triggers + actions.
- **Connect flow** — create a connection to an MCP app (config/credentials).
- **Workflow builder** — pick a trigger, chain actions, map outputs via `{{step.output}}`
  template expressions, auto-generated config fields from MCP input schemas.
- **Engine** — runs workflows (poll trigger → execute actions), stores run history with logs.
- **Live runs page** — watch execution logs in real time.

## Quick start

```bash
npm install
npm run dev
```

- API: http://localhost:3000
- Web UI: http://localhost:5173 (Vite auto-opens)

## Authentication

Every `/api` route except `/health` and `/auth/login` requires a **Bearer token**.

- POST `POST /api/auth/login` with `{"password": "<password>"}` → `{"token": "…"}`.
- Send `Authorization: Bearer <token>` on all other requests.
- Demo password: `relay-demo` (override via `RELAY_PASSWORD`).
- The token is generated on first run and persisted to `server/data/token.json`
  (or fixed via `RELAY_API_TOKEN`).

The demo MCP server is bundled and spawns automatically — no external MCP servers needed.
To point a connection at any real MCP server (stdio), open the app's connection settings and
set the command/args (e.g. `npx @modelcontextprotocol/server-everything`).

## Scripts
- `npm run dev` — run API + web together
- `npm run dev -w server` — API only (port 3000)
- `npm run dev -w web` — web only (port 5173)
- `npm run build` — build both
- `npm run start -w server` — API only, built/tsx
- `npm run preview -w web` — serve the production build (port 4173, proxies `/api` to :3000)

> **Note on Windows packaged environments**: some sandboxed Windows setups redirect `AppData\Roaming`
> through a per-package `LocalCache` path, which can prevent Vite's dev-mode JSX transform from
> applying. If you see a blank page in `npm run dev` on such a host, run the production route instead:
> `npm run build && npm run preview` (open http://localhost:4173). On a normal OS this workaround
> is not needed.

## Smoke test (API running)
```bash
node server/scripts/smoke.mjs   # creates a workflow and runs it through the MCP server
```

## Repo layout
```
server/                 API, workflow engine, MCP client, demo MCP servers
  mcp-servers/demo-server.mjs   demo MCP server (stdio, JSON-RPC)
  src/lib/mcp-client.ts          MCP client (SDK over stdio)
  src/lib/engine.ts              workflow execution engine
  src/routes/                    REST endpoints
web/                    React + Vite frontend
```
