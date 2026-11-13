/**
 * D1 data access. Every statement filters by uid — user isolation is enforced
 * here, not in the handlers.
 */

import type { FinanceProfile, HealthProfile, Locale, Madhhab, WebUser } from '../../../shared/types';
import { DEFAULT_SAVINGS_RATES } from '../../../shared/budget';
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from '../../../shared/constants';
import type { AuthUser } from './auth';
import { nowISO } from './http';

export interface UserRow {
  uid: string;
  email: string | null;
  display_name: string | null;
  locale: string;
  timezone: string;
  currency: string;
  theme: string;
  madhhab: string;
  ai_mode: string;
  consent_at: string | null;
  onboarding_done: number;
  health_json: string;
  finance_json: string;
  balance_minor: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_HEALTH: HealthProfile = {
  conditions: [],
  medications: [],
  allergies: [],
};

export function defaultFinance(currency = DEFAULT_CURRENCY): FinanceProfile {
  return {
    currency,
    incomes: [],
    fixedExpenses: [],
    savingsRates: { ...DEFAULT_SAVINGS_RATES },
    level: 'normal',
  };
}

export function safeParseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

const LOCALES: Locale[] = ['ar', 'ru', 'en'];
const MADHHABS: Madhhab[] = ['hanafi', 'shafii', 'maliki', 'hanbali', 'none'];

export function mapUserRow(row: UserRow): WebUser {
  const health = { ...DEFAULT_HEALTH, ...safeParseJson<Partial<HealthProfile>>(row.health_json, {}) };
  const financeRaw = safeParseJson<Partial<FinanceProfile>>(row.finance_json, {});
  const finance: FinanceProfile = {
    ...defaultFinance(row.currency || DEFAULT_CURRENCY),
    ...financeRaw,
    incomes: Array.isArray(financeRaw.incomes) ? financeRaw.incomes : [],
    fixedExpenses: Array.isArray(financeRaw.fixedExpenses) ? financeRaw.fixedExpenses : [],
    savingsRates: { ...DEFAULT_SAVINGS_RATES, ...(financeRaw.savingsRates ?? {}) },
    level: financeRaw.level ?? 'normal',
  };
  return {
    uid: row.uid,
    email: row.email,
    displayName: row.display_name,
    locale: (LOCALES.includes(row.locale as Locale) ? row.locale : 'ar') as Locale,
    timezone: row.timezone || DEFAULT_TIMEZONE,
    currency: row.currency || DEFAULT_CURRENCY,
    theme: (['system', 'light', 'dark'].includes(row.theme) ? row.theme : 'system') as WebUser['theme'],
    madhhab: (MADHHABS.includes(row.madhhab as Madhhab) ? row.madhhab : 'none') as Madhhab,
    aiMode: row.ai_mode === 'own' ? 'own' : 'builtin',
    consentAt: row.consent_at,
    onboardingDone: row.onboarding_done === 1,
    health,
    finance,
    balanceMinor: Number.isFinite(row.balance_minor) ? row.balance_minor : 0,
    createdAt: row.created_at,
  };
}

export async function getUser(db: D1Database, uid: string): Promise<WebUser | null> {
  const row = await db.prepare('SELECT * FROM users WHERE uid = ?').bind(uid).first<UserRow>();
  return row ? mapUserRow(row) : null;
}

/** Creates the user row on first authenticated request (idempotent). */
export async function ensureUser(db: D1Database, auth: AuthUser, locale: Locale = 'ar'): Promise<WebUser> {
  const existing = await getUser(db, auth.uid);
  if (existing) return existing;

  const ts = nowISO();
  await db
    .prepare(
      `INSERT INTO users
        (uid, email, display_name, locale, timezone, currency, theme, madhhab, ai_mode,
         consent_at, onboarding_done, health_json, finance_json, balance_minor, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'system', 'none', 'builtin', NULL, 0, ?, ?, 0, ?, ?)
       ON CONFLICT(uid) DO NOTHING`,
    )
    .bind(
      auth.uid,
      auth.email,
      auth.name,
      locale,
      DEFAULT_TIMEZONE,
      DEFAULT_CURRENCY,
      JSON.stringify(DEFAULT_HEALTH),
      JSON.stringify(defaultFinance()),
      ts,
      ts,
    )
    .run();

  const created = await getUser(db, auth.uid);
  if (!created) throw new Error('Failed to create user row');
  return created;
}

const UPDATABLE_COLUMNS: Record<string, string> = {
  locale: 'locale',
  timezone: 'timezone',
  currency: 'currency',
  theme: 'theme',
  madhhab: 'madhhab',
  aiMode: 'ai_mode',
  consentAt: 'consent_at',
  onboardingDone: 'onboarding_done',
  health: 'health_json',
  finance: 'finance_json',
  balanceMinor: 'balance_minor',
  displayName: 'display_name',
};

export interface UserPatch {
  locale?: string;
  timezone?: string;
  currency?: string;
  theme?: string;
  madhhab?: string;
  aiMode?: string;
  consentAt?: string | null;
  onboardingDone?: boolean;
  health?: HealthProfile;
  finance?: FinanceProfile;
  balanceMinor?: number;
  displayName?: string | null;
}

export async function updateUser(db: D1Database, uid: string, patch: UserPatch): Promise<WebUser | null> {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = patch[key as keyof UserPatch];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    values.push(key === 'health' || key === 'finance' ? JSON.stringify(value) : key === 'onboardingDone' ? (value ? 1 : 0) : value);
  }

  if (!sets.length) return getUser(db, uid);
  sets.push('updated_at = ?');
  values.push(nowISO(), uid);

  await db
    .prepare(`UPDATE users SET ${sets.join(', ')} WHERE uid = ?`)
    .bind(...values)
    .run();
  return getUser(db, uid);
}

/** Full account wipe (D1 side). Firebase deletion happens in the handler. */
export async function deleteUserData(db: D1Database, uid: string): Promise<void> {
  const statements = [
    'DELETE FROM messages WHERE uid = ?',
    'DELETE FROM chats WHERE uid = ?',
    'DELETE FROM assets WHERE uid = ?',
    'DELETE FROM transactions WHERE uid = ?',
    'DELETE FROM halal_scans WHERE uid = ?',
    'DELETE FROM rate_limits WHERE uid = ?',
    'DELETE FROM income_confirmations WHERE uid = ?',
    'DELETE FROM ai_usage WHERE uid = ?',
    'DELETE FROM users WHERE uid = ?',
  ];
  await db.batch(statements.map((sql) => db.prepare(sql).bind(uid)));
}

