// Loads the reserved-handle blocklist (scope §6.1) into the local BLOCKLIST KV
// namespace so `wrangler pages dev` can serve GET /api/name against it.
import { execFileSync } from 'node:child_process';

const BLOCKLIST = [
  'admin', 'dobaness', 'doba', 'official', 'support', 'mod', 'moderator',
  'help', 'root', 'system', 'staff', 'team', 'ruto', 'safaricom', 'mpesa',
  'kplc', 'equity', 'ncba', 'nation', 'citizen', 'ktn', 'police', 'gov',
  'kenya', 'statehouse',
];

for (const handle of BLOCKLIST) {
  console.log('seeding blocklist:', handle);
  execFileSync(
    'npx',
    ['wrangler', 'kv', 'key', 'put', '--binding=BLOCKLIST', '--local', `handle:${handle}`, '1'],
    { stdio: 'inherit', shell: true }
  );
}

console.log(`seed-kv: loaded ${BLOCKLIST.length} reserved handles into local KV`);
