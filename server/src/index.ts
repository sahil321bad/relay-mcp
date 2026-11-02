import express from 'express';
import cors from 'cors';
import { db } from './store';
import { APPS, seedConnections } from './data/seed';
import { router } from './routes';

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
});
