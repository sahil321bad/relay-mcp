import express from 'express';
import cors from 'cors';
import { db } from './store';
import { APPS, seedConnections } from './data/seed';
import { router } from './routes';
import { getWorkspaceToken, RELAY_PASSWORD } from './lib/auth';

const PORT = Number(process.env.PORT || 3000);

function seed() {
  if (db.apps.all().length === 0) {
    for (const app of APPS) db.apps.insert({ ...app });
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
