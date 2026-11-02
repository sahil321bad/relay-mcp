import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { writeFileSync, createWriteStream, existsSync } from 'node:fs';

const bin = join(process.cwd(), 'scripts', 'bin', 'cloudflared.exe');
const logPath = join(process.cwd(), 'scripts', 'bin', 'tunnel.log');

// clear previous log
writeFileSync(logPath, '');
const log = createWriteStream(logPath, { flags: 'a' });

const child = spawn(bin, ['tunnel', '--url', 'http://127.0.0.1:3000'], { stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log);
child.stderr.pipe(log);
child.stdout.on('data', (d) => process.stdout.write(d));
child.stderr.on('data', (d) => process.stderr.write(d));
child.on('close', (code) => { console.log('[cloudflared exited]', code); log.end(); process.exit(code ?? 0); });
