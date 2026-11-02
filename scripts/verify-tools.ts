import { googleTools } from '../server/src/lib/google-tools';
import { GMail_STEPS, DRIVE_STEPS } from '../server/src/data/google-catalog';

const catalogSteps = [...GMail_STEPS, ...DRIVE_STEPS];
const toolKeys = Object.keys(googleTools);

const catalogIds = catalogSteps.map((s) => s.id);
const missing = catalogIds.filter((id) => !toolKeys.includes(id));
const implementedNotCataLoged = toolKeys.filter((id) => !catalogIds.includes(id) && !id.startsWith('sheets.'));

console.log('catalog steps:', catalogSteps.length, '(gmail=' + GMail_STEPS.length + ', drive=' + DRIVE_STEPS.length + ')');
console.log('implemented tool keys:', toolKeys.length);
console.log('MISSING implementations for catalog steps:', missing.length ? JSON.stringify(missing) : 'NONE');
console.log('implemented but not in catalog (non-sheets):', implementedNotCataLoged.length ? JSON.stringify(implementedNotCataLoged) : 'NONE');

if (missing.length > 0) process.exit(1);
console.log('OK: every catalogued Gmail/Drive step has an implementation');
