import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
const out = join(process.cwd(), 'scripts', 'bin', 'cloudflared.exe');
mkdirSync(join(process.cwd(), 'scripts', 'bin'), { recursive: true });

console.log('downloading cloudflared…', url);
const res = await fetch(url, { redirect: 'follow' });
if (!res.ok) throw new Error('HTTP ' + res.status);
const buf = Buffer.from(await res.arrayBuffer());
writeFileSync(out, buf);
console.log('saved', out, buf.length, 'bytes');
