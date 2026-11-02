import { readFileSync } from 'node:fs';
const d = JSON.parse(readFileSync('server/data/mock-world.json', 'utf8'));
console.log('slack messages:', d.slack.length);
console.log('sheets Leads rows:', (d.sheets?.['sheet:Leads'] || []).length);
console.log('last slack:', JSON.stringify(d.slack[d.slack.length - 1]));
