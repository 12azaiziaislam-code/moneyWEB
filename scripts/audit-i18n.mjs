import fs from 'node:fs';
import path from 'node:path';

const ar = JSON.parse(fs.readFileSync('src/i18n/ar.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/i18n/en.json', 'utf8'));
const ru = JSON.parse(fs.readFileSync('src/i18n/ru.json', 'utf8'));

function getVal(obj, keyPath) {
  const parts = keyPath.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[p];
  }
  return curr;
}

function findFiles(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) res.push(...findFiles(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) res.push(full);
  }
  return res;
}

const files = findFiles('src');
// Match t('key') and t("key")
const tRegex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;

const missing = [];
const allUsedKeys = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[1];
    allUsedKeys.add(key);
    const arVal = getVal(ar, key);
    const enVal = getVal(en, key);
    const ruVal = getVal(ru, key);
    if (arVal === undefined || enVal === undefined || ruVal === undefined) {
      missing.push({
        file: path.relative(process.cwd(), file),
        key,
        ar: arVal !== undefined,
        en: enVal !== undefined,
        ru: ruVal !== undefined,
      });
    }
  }
}

console.log('--- MISSING I18N KEYS IN CODE ---');
console.log('Total keys checked:', allUsedKeys.size);
console.log('Total missing instances:', missing.length);
for (const m of missing) {
  console.log(`[${m.file}] Key: "${m.key}" -> AR: ${m.ar}, EN: ${m.en}, RU: ${m.ru}`);
}
