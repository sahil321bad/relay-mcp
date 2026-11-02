const BASE = 'http://localhost:3000/api';

const prov = await fetch(BASE + '/auth/providers').then((r) => r.json());
const google = prov.providers.find((p) => p.id === 'google');
console.log('google configured:', google.configured);

const r = await fetch(BASE + '/auth/oauth/google', { redirect: 'manual' });
console.log('authorize status:', r.status);
const loc = r.headers.get('location') || '';
console.log('redirect target starts with accounts.google.com:', loc.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'));
const u = new URL(loc);
console.log('client_id matches configured:', u.searchParams.get('client_id') === '329430633677-fe3a3rks4ktthn5316kbh98au53shn6u.apps.googleusercontent.com');
const scope = u.searchParams.get('scope') || '';
console.log('has gmail scope:', scope.includes('gmail.modify'));
console.log('has drive scope:', scope.includes('drive.file'));
console.log('has sheets scope:', scope.includes('spreadsheets'));
console.log('access_type=offline:', u.searchParams.get('access_type') === 'offline');
console.log('prompt=consent:', u.searchParams.get('prompt') === 'consent');
console.log('redirect_uri:', u.searchParams.get('redirect_uri'));
console.log('state present:', !!u.searchParams.get('state'));
