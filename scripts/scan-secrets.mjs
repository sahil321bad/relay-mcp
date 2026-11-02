// Secret scanner — scans *tracked* files (git ls-files) for high-risk credential
// patterns. Intended to run locally and in CI to prevent leaking secrets into a
// repo. server/.env is git-ignored, so it is not scanned (it is local-only).
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const PATTERNS = [
  { name: 'Google OAuth client secret', re: /GOCSPX-[A-Za-z0-9_-]{20,}/g },
  { name: 'Google API key', re: /AIza[0-9A-Za-z_-]{30,}/g },
  { name: 'AWS secret access key', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'GitHub token', re: /(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}/g },
  { name: 'Stripe secret key', re: /sk_live_[0-9a-zA-Z]{20,}/g },
  { name: 'Slack bot token', re: /xox[baprs]-[0-9A-Za-z-]{10,}/g },
  { name: 'Generic assignment of secret env', re: /(?:CLIENT_SECRET|API_KEY|SECRET_KEY|TOKEN)\s*=\s*['"]?[A-Za-z0-9_\-]{16,}['"]?/g },
];

const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
let found = false;
const ignored = new Set(['server/.env', '.env']);

for (const f of files) {
  if (ignored.has(f) || !existsSync(f)) continue;
  const text = readFileSync(f, 'utf8');
  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const raw = m[0];
      const val = raw.includes('=') ? raw.slice(raw.indexOf('=') + 1).replace(/['"]/g, '').trim() : raw;
      if (/^(your_|YOUR_|your |<|\[|changeme|change-me|xxx|placeholder|example|REPLACE|dummy|redacted)/i.test(val)) continue;
      found = true;
      const line = text.slice(0, m.index).split('\n').length;
      console.log(`[!] ${name} in ${f}:${line} -> ${val.slice(0, 6)}…`);
    }
  }
}

if (found) {
  console.error('\nSecret scan FAILED — remove the flagged values and re-run.');
  process.exit(1);
}
console.log(`Secret scan OK — ${files.length} tracked files checked, no credentials found.`);
