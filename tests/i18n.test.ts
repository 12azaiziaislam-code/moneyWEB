import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function getLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const k in obj) {
    const full = prefix ? `${prefix}.${k}` : k;
    const val = obj[k];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      keys = keys.concat(getLeafKeys(val as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function getVal(obj: Record<string, unknown>, keyPath: string): unknown {
  const parts = keyPath.split('.');
  let curr: unknown = obj;
  for (const p of parts) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = (curr as Record<string, unknown>)[p];
  }
  return curr;
}

function findSourceFiles(dir: string): string[] {
  let res: string[] = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) res.push(...findSourceFiles(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) res.push(full);
  }
  return res;
}

describe('i18n Complete Parity & Code Coverage', () => {
  const arPath = path.resolve(__dirname, '../src/i18n/ar.json');
  const enPath = path.resolve(__dirname, '../src/i18n/en.json');
  const ruPath = path.resolve(__dirname, '../src/i18n/ru.json');

  const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

  const arKeys = new Set(getLeafKeys(ar));
  const enKeys = new Set(getLeafKeys(en));
  const ruKeys = new Set(getLeafKeys(ru));

  it('all keys must exist symmetrically across ar, en, and ru', () => {
    const all = new Set([...arKeys, ...enKeys, ...ruKeys]);
    const missing: string[] = [];

    for (const key of all) {
      if (!arKeys.has(key)) missing.push(`Key "${key}" is missing in ar.json`);
      if (!enKeys.has(key)) missing.push(`Key "${key}" is missing in en.json`);
      if (!ruKeys.has(key)) missing.push(`Key "${key}" is missing in ru.json`);
    }

    expect(missing).toEqual([]);
  });

  it('no translation string should be empty or untrimmed', () => {
    for (const k of arKeys) {
      const arVal = String(getVal(ar, k) ?? '');
      const enVal = String(getVal(en, k) ?? '');
      const ruVal = String(getVal(ru, k) ?? '');

      expect(arVal.trim().length, `Empty string in ar.json: ${k}`).toBeGreaterThan(0);
      expect(enVal.trim().length, `Empty string in en.json: ${k}`).toBeGreaterThan(0);
      expect(ruVal.trim().length, `Empty string in ru.json: ${k}`).toBeGreaterThan(0);
    }
  });

  it('every static t("...") call in src code must exist in all dictionaries', () => {
    const files = findSourceFiles(path.resolve(__dirname, '../src'));
    const tRegex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
    const missingInCode: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      let match: RegExpExecArray | null;
      while ((match = tRegex.exec(content)) !== null) {
        const key = match[1];
        if (getVal(ar, key) === undefined) missingInCode.push(`[${path.basename(file)}] missing "${key}" in ar.json`);
        if (getVal(en, key) === undefined) missingInCode.push(`[${path.basename(file)}] missing "${key}" in en.json`);
        if (getVal(ru, key) === undefined) missingInCode.push(`[${path.basename(file)}] missing "${key}" in ru.json`);
      }
    }

    expect(missingInCode).toEqual([]);
  });
});

