// Explicit Vite dev server launcher. Fixes environments where Vite's automatic
// root/config detection resolves to a virtualized cache path (Windows package
// install) and fails to apply the JSX transform.
import { createServer } from 'vite';
import { join, resolve } from 'node:path';

const here = process.cwd();
const webRoot = resolve(here, 'web');
const configFile = join(webRoot, 'vite.config.ts');

const server = await createServer({
  root: webRoot,
  configFile,
  logLevel: 'info',
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});

await server.listen();
server.printUrls();
