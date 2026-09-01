// CLI over local D1 for the write queues — "curation runs on SQL + a CLI,"
// no admin UI (revision-spec §9: admin/read interface is out of scope).
//
// Usage:
//   node scripts/curate.mjs submissions list
//   node scripts/curate.mjs submissions approve <id> [--handle=@name]
//   node scripts/curate.mjs submissions reject <id>
//   node scripts/curate.mjs slots list
//   node scripts/curate.mjs slots confirm <id>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const AXIS_TITLES = {
  mtaa: 'Mtaa Vibes', matatu: 'Matatu Diaries', situ: 'Situationship Files',
  comr: "Comrades' Corner", bunge: 'Ka Bunge', other: 'Others',
};

function d1(sql) {
  // Write SQL to a temp file and use --file — passing multi-word SQL via
  // --command through execFileSync's Windows shell re-splits on spaces.
  const dir = mkdtempSync(join(tmpdir(), 'dobaness-curate-'));
  const file = join(dir, 'q.sql');
  writeFileSync(file, sql);
  try {
    const out = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'DB', '--local', '--json', '--file', file],
      { encoding: 'utf8', shell: true, cwd: root }
    );
    const parsed = JSON.parse(out);
    return parsed[0]?.results || [];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function esc(s) { return String(s).replace(/'/g, "''"); }

function hashId(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return 'p' + h.toString(36);
}
function wordCount(text) { return String(text).trim().split(/\s+/).filter(Boolean).length; }
function wordClass(text) { return wordCount(text) <= 4 ? 'short' : 'standard'; }

// Simple placeholder generator matching the three templates (spec §12), for
// submissions approved without a separately-claimed name. A curator who
// knows the real author should pass --handle=@name instead.
const FIRST = ['Brian', 'Faith', 'Kevo', 'Achieng', 'Wanjiru', 'Otieno', 'Mercy', 'Kiplangat'];
const ATTR = ['Vibes', 'Fresh', 'Poa', 'Chonjo', 'Sharp', 'Fiti', 'Rada', 'Sare'];
const COUNTY = [['Nairobi', 47], ['Kiambu', 22], ['Nakuru', 32], ['Mombasa', 1], ['Kisumu', 42], ['Machakos', 16], ['Uasin Gishu', 27]];
function generatePlaceholderHandle() {
  const first = FIRST[Math.floor(Math.random() * FIRST.length)];
  const attr = ATTR[Math.floor(Math.random() * ATTR.length)];
  const [, code] = COUNTY[Math.floor(Math.random() * COUNTY.length)];
  return `@${first}_${attr}_${code}`;
}

function cmdSubmissionsList() {
  const rows = d1("SELECT * FROM submissions WHERE status='pending' ORDER BY created_at");
  if (!rows.length) { console.log('submissions: nothing pending'); return; }
  for (const r of rows) {
    console.log(`#${r.id}  [${r.bundle}]  "${r.text}"  (${wordCount(r.text)}w)${r.source_url ? '  seen: ' + r.source_url : ''}`);
  }
}

function cmdSubmissionsDecide(id, status, handleOverride) {
  const rows = d1(`SELECT * FROM submissions WHERE id='${esc(id)}'`);
  const row = rows[0];
  if (!row) { console.error('no submissions row with id', id); process.exit(1); }

  d1(`UPDATE submissions SET status='${status}' WHERE id='${esc(id)}'`);

  if (status === 'approved') {
    const handle = handleOverride || generatePlaceholderHandle();
    const handleSource = handleOverride ? 'collected' : 'placeholder';
    const seedPath = join(root, 'seed', 'posts.json');
    const posts = JSON.parse(readFileSync(seedPath, 'utf8'));
    const newId = hashId(handle + '|' + row.text);
    if (!posts.some(p => p.id === newId)) {
      posts.push({
        id: newId,
        body: row.text,
        handle,
        handle_source: handleSource,
        axis: row.bundle,
        origin: AXIS_TITLES[row.bundle] || row.bundle,
        word_class: wordClass(row.text),
        source_url: row.source_url || '',
        source_platform: '',
        collected_at: row.created_at,
      });
      writeFileSync(seedPath, JSON.stringify(posts, null, 2) + '\n');
      console.log(`approved #${id} -> ${handle} appended to seed/posts.json (id ${newId}). Run "npm run build" to ship it.`);
    } else {
      console.log(`approved #${id} -> already present in seed/posts.json`);
    }
  } else {
    console.log(`rejected #${id}`);
  }
}

function cmdSlotsList() {
  const rows = d1("SELECT * FROM slot_claims WHERE status='interest' ORDER BY created_at");
  if (!rows.length) { console.log('slot_claims: nothing new'); return; }
  for (const r of rows) {
    console.log(`#${r.id}  ${r.brand_name} (${r.contact_name})  ${r.whatsapp}  bundle:${r.bundle_pref || 'none'}${r.notes ? '  notes: ' + r.notes : ''}`);
  }
}

function cmdSlotsConfirm(id) {
  const rows = d1(`SELECT * FROM slot_claims WHERE id='${esc(id)}'`);
  if (!rows[0]) { console.error('no slot_claims row with id', id); process.exit(1); }
  d1(`UPDATE slot_claims SET status='confirmed' WHERE id='${esc(id)}'`);
  console.log(`confirmed #${id} — /api/stats will reflect one fewer founding slot left`);
}

const argv = process.argv.slice(2);
const [table, action, id] = argv;
const handleFlag = argv.find(a => a.startsWith('--handle='));
const handleOverride = handleFlag ? handleFlag.slice('--handle='.length) : null;

if (table === 'submissions' && action === 'list') cmdSubmissionsList();
else if (table === 'submissions' && action === 'approve' && id) cmdSubmissionsDecide(id, 'approved', handleOverride);
else if (table === 'submissions' && action === 'reject' && id) cmdSubmissionsDecide(id, 'rejected', handleOverride);
else if (table === 'slots' && action === 'list') cmdSlotsList();
else if (table === 'slots' && action === 'confirm' && id) cmdSlotsConfirm(id);
else {
  console.log(`usage:
  node scripts/curate.mjs submissions list
  node scripts/curate.mjs submissions approve <id> [--handle=@name]
  node scripts/curate.mjs submissions reject <id>
  node scripts/curate.mjs slots list
  node scripts/curate.mjs slots confirm <id>`);
  process.exit(1);
}
