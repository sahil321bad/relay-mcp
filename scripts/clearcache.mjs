import { rmSync } from 'node:fs';
import { join } from 'node:path';
const cache = join(process.cwd(), 'web', 'node_modules', '.vite');
rmSync(cache, { recursive: true, force: true });
console.log('cleared', cache);
