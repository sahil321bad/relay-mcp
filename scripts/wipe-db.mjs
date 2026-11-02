import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
for (const f of ['relay.db', 'relay.db-journal', '.token-key']) {
  const p = join(process.cwd(), 'server', 'data', f);
  if (existsSync(p)) { rmSync(p, { force: true }); console.log('deleted', p); }
}
