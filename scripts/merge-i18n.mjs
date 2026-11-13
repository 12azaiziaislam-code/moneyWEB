// One-off: deep-merge the redesign/guest copy into src/i18n/*.json
import { readFileSync, writeFileSync } from 'node:fs';

const deepMerge = (target, source) => {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = deepMerge(target[key] && typeof target[key] === 'object' ? target[key] : {}, value);
    } else {
      target[key] = value;
    }
  }
  return target;
};

for (const locale of ['ar', 'ru', 'en']) {
  const base = JSON.parse(readFileSync(`src/i18n/${locale}.json`, 'utf8'));
  const extra = JSON.parse(readFileSync(`scripts/i18n-add/${locale}.json`, 'utf8'));
  const merged = deepMerge(base, extra);
  writeFileSync(`src/i18n/${locale}.json`, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(locale, 'merged');
}
