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

Every `/api` route except `/health` and `/auth/*` requires a **Bearer token**
(either the workspace token or a user session token).

- Sign in via the web UI with **Google or GitHub** (OAuth) or the **demo user**.
- Workspace (headless) credentials: `POST /api/auth/login` with
  `{"password": "<password>"}` → `{"token": "…"}`; default password `relay-demo`
  (override via `RELAY_PASSWORD`). The workspace token is generated on first run,
  persisted to `server/data/token.json` (or fixed via `RELAY_API_TOKEN`).

### Google / GitHub OAuth
Set these env vars on the API process:

```
GOOGLE_CLIENT_ID=...        GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...        GITHUB_CLIENT_SECRET=...
APP_BASE_URL=http://localhost:3000      # public base of the API
APP_WEB_URL=http://localhost:4173       # where the browser is redirected after login
```

Redirect URIs to register with each provider:
- Google: `http://localhost:3000/api/auth/oauth/google/callback`
- GitHub: `http://localhost:3000/api/auth/oauth/github/callback`

Security notes (implemented):
- OAuth state (`state`) is generated per flow and verified in the callback (CSRF protection).
- The session token is never placed in the URL. After OAuth the server redirects
  with a short-lived, single-use one-time code, which the frontend exchanges via
  `POST /api/auth/exchange` for the real token.
- The API token in the MCP Server → Settings page can be rotated/revoked (UI).

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

## Real Google integration (Gmail · Drive · Sheets)
Connecting a real Google account makes the Gmail, Google Drive and Google Sheets tools go live.

1. In Google Cloud Console create an **OAuth client ID** (Application type: *Web app*).
2. Add the authorized redirect URI: `http://localhost:3000/api/auth/oauth/google/callback`
   (match `APP_BASE_URL`).
3. Enable these APIs: **Gmail API**, **Google Drive API**, **Google Sheets API**.
4. Provide the credentials **via environment / a local .env** — never commit them:
   ```bash
   cp server/.env.example server/.env   # edit with your real values
   # or export them in your shell/process manager.
   # `server/.env` is gitignored and blocked by a pre-commit hook.
   ```
5. Sign in to Relay with **"Continue with Google"** — the account is connected automatically
   and the Builder exposes real tools: `Gmail Send Email / New Email trigger / Add Label /
   Archive / Delete`, `Drive List Files / Create Folder`, `Sheets Append Row / Read Range`.

Google access & refresh tokens are **encrypted at rest** (AES-256-GCM). The key comes from
`RELAY_TOKEN_KEY` (hex) or an auto-generated `server/data/.token-key` file.

### 🔐 Secret handling
- **Never commit** `GOOGLE_CLIENT_SECRET` or real client IDs. `server/.env` is gitignored,
  and a pre-commit hook blocks any `.env` file:
  ```bash
  git config core.hooksPath .githooks    # enable the guard once
  ```
- If your Google OAuth credentials are ever exposed (e.g. pasted in plaintext), **rotate them
  immediately**: in Google Cloud Console generate a new client secret and regenerate the OAuth
  client ID, then update your local `server/.env` / environment.

## Database
Persistent **SQLite** (`node:sqlite`) at `server/data/relay.db`. Collections: `apps`,
`connections`, `workflows`, `runs`, `users`, `sessions`. Data survives restarts.

## Smoke test (API running)
```bash
node server/scripts/smoke.mjs   # creates a workflow and runs it through the MCP server
node server/scripts/tgoogle.mjs # verifies Google wiring + guard (no credentials needed)
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
