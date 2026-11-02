import { loadConfigFromFile } from 'vite';
import { join } from 'node:path';

const root = join(process.cwd(), 'web');
console.log('root =', root);

try {
  const cfg = await loadConfigFromFile({ command: 'serve', mode: 'development' }, join(root, 'vite.config.ts'), root);
  if (!cfg) {
    console.log('NO CONFIG FOUND');
    process.exit(0);
  }
  console.log('config loaded. plugins:', (cfg.config.plugins || []).map(p => p.name).join(', ') || '(none)');
  console.log('config.server:', JSON.stringify(cfg.config.server || {}));
} catch (e) {
  console.error('config load error:', e.message);
  console.error(e.stack);
}
