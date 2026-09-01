// Compiles seed/posts.json into src/index.template.html -> public/index.html.
// "The wall's posts are static, compiled into the HTML, not fetched." — scope §3
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SEED_MARKER = '/*__DOBANESS_SEED_POSTS__*/';
const JS_MARKER = '/*__DOBANESS_APP_JS__*/';
const COUNT_MARKER = '__DOBANESS_SPLASH_COUNT__';

const template = readFileSync(join(root, 'src', 'index.template.html'), 'utf8');
const posts = JSON.parse(readFileSync(join(root, 'seed', 'posts.json'), 'utf8'));
const appJs = readFileSync(join(root, 'src', 'app.js'), 'utf8');

for (const marker of [SEED_MARKER, JS_MARKER, COUNT_MARKER]) {
  if (!template.includes(marker)) {
    throw new Error(`build-seed: marker ${marker} not found in src/index.template.html`);
  }
}

const injected = template
  .replace(SEED_MARKER, JSON.stringify(posts))
  .replace(JS_MARKER, appJs)
  .replaceAll(COUNT_MARKER, String(posts.length));

mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'index.html'), injected);
copyFileSync(join(root, 'src', 'assets', 'dobaness-bg.jpg'), join(root, 'public', 'dobaness-bg.jpg'));

console.log(`build-seed: inlined ${posts.length} posts -> public/index.html (${injected.length} bytes)`);
console.log('build-seed: copied dobaness-bg.jpg -> public/');
