import { issueOneTimeCode } from '../server/src/lib/auth';
import { db } from '../server/src/store';

async function main() {
  const users = db.users.all();
  console.log('users in db:', users.length);
  const u = users[0];
  if (!u) { console.log('NO USERS'); process.exit(1); }
  const code = issueOneTimeCode(u.id);
  const r = await fetch('http://localhost:3000/api/auth/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const d = await r.json().catch(() => ({}));
  console.log('exchange status:', r.status, '| token issued:', !!d.token, '| user:', d.user?.provider || d.user?.email || '');
}
main();
