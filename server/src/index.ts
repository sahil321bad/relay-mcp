import express from 'express';
import cors from 'cors';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './store';
import { APPS, seedConnections } from './data/seed';
import { router } from './routes';
import { getWorkspaceToken, RELAY_PASSWORD } from './lib/auth';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal .env loader (no external dependency). Loads server/.env or cwd/.env
// without overriding variables already present in the environment.
function loadEnv() {
  const candidates = [join(__dirname, '..', '.env'), join(process.cwd(), '.env')];
  for (const f of candidates) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
}
loadEnv();

const PORT = Number(process.env.PORT || 3000);

function seed() {
  // Idempotent: insert each built-in app only if it isn't already present.
  for (const app of APPS) {
    if (!db.apps.get(app.id)) db.apps.insert({ ...app });
  }
  seedConnections();
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api', router);

seed();

app.listen(PORT, () => {
  console.log(`[relay-api] listening on http://localhost:${PORT}`);
  console.log(`[relay-api] demo password: ${RELAY_PASSWORD}`);
  console.log(`[relay-api] API bearer token: ${getWorkspaceToken()}`);
});
