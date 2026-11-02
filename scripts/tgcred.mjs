// Smoke-check the real Google OAuth wiring WITHOUT hardcoded credentials.
//
// Reads expected values from the environment:
//   GOOGLE_CLIENT_ID  (required for the client_id assertion)
//   APP_BASE_URL       (defaults to http://localhost:3000)
// Fails with a diagnostic when required env vars are missing.
const expectedClientId = process.env.GOOGLE_CLIENT_ID;
const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
if (!expectedClientId) {
  console.error('[tgcred] GOOGLE_CLIENT_ID is not set. Export it (or run with --env-file) to verify the client_id match.');
  process.exit(2);
}
const BASE = baseUrl + '/api';

const prov = await fetch(BASE + '/auth/providers').then((r) => r.json());
const google = prov.providers.find((p) => p.id === 'google');
console.log('google configured:', google.configured);

const r = await fetch(BASE + '/auth/oauth/google', { redirect: 'manual' });
console.log('authorize status:', r.status);
const loc = r.headers.get('location') || '';
console.log('redirects to accounts.google.com:', loc.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'));
const u = new URL(loc);
console.log('client_id matches GOOGLE_CLIENT_ID:', u.searchParams.get('client_id') === expectedClientId);
const scope = u.searchParams.get('scope') || '';
console.log('has gmail+drive+sheets scopes:', scope.includes('gmail.modify') && scope.includes('drive.file') && scope.includes('spreadsheets'));
console.log('access_type=offline:', u.searchParams.get('access_type') === 'offline');
console.log('prompt=consent:', u.searchParams.get('prompt') === 'consent');
console.log('redirect_uri matches APP_BASE_URL:', u.searchParams.get('redirect_uri') === `${baseUrl}/api/auth/oauth/google/callback`);
console.log('state present:', !!u.searchParams.get('state'));
