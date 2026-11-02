const BASE = 'http://localhost:3000/api';
const login = await fetch(BASE + '/auth/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
const lj = await login.json();
console.log('login status', login.status, 'has token', !!lj.token);

const body = JSON.stringify({
  name: 'debug wf',
  description: '',
  trigger: { id: 'mailbox.new_email', appId: 'mailbox', config: {} },
  actions: [{ id: 'gmail.send_email', appId: 'gmail', config: { to: 'x@y.z', subject: 'hi', body: 'yo' } }],
  enabled: false,
});
console.log('body length', body.length);
const r = await fetch(BASE + '/workflows', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lj.token}` },
  body,
});
const t = await r.text();
console.log('status', r.status);
console.log('response', t.slice(0, 500));
