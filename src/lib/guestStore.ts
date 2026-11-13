/**
 * Guest data — stored ONLY in this browser (IndexedDB). Nothing about a guest
 * is ever written to D1: the worker receives just the text/image of the request
 * being processed.
 */

import { computePlan } from '../../shared/budget';
import { addDays, localDateISO } from '../../shared/payday';
import type {
  ChatKind,
  FinanceProfile,
  HealthProfile,
  Locale,
  Madhhab,
  PlanResult,
  Transaction,
  WebUser,
} from '../../shared/types';
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from '../../shared/constants';
import { CacheKeys, idbDel, idbGet, idbSet } from './idb';

export interface GuestMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface GuestChat {
  id: string;
  kind: ChatKind;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messages: GuestMessage[];
}

export interface GuestSettings {
  locale: Locale;
  currency: string;
  timezone: string;
  madhhab: Madhhab;
  health: HealthProfile;
  finance: FinanceProfile;
  balanceMinor: number;
  consentAt: string | null;
}

export interface GuestData {
  version: 1;
  settings: GuestSettings;
  chats: GuestChat[];
  transactions: Transaction[];
  updatedAt: string;
}

const LIMITS = { chats: 30, messagesPerChat: 60, transactions: 300 };

export function emptyGuestSettings(locale: Locale = 'ru'): GuestSettings {
  return {
    locale,
    currency: DEFAULT_CURRENCY,
    timezone: DEFAULT_TIMEZONE,
    madhhab: 'none',
    health: { conditions: [], medications: [], allergies: [] },
    finance: {
      currency: DEFAULT_CURRENCY,
      incomes: [],
      fixedExpenses: [],
      savingsRates: { hard: 30, normal: 15, easy: 5 },
      level: 'normal',
    },
    balanceMinor: 0,
    consentAt: null,
  };
}

export function emptyGuestData(locale: Locale = 'ru'): GuestData {
  return {
    version: 1,
    settings: emptyGuestSettings(locale),
    chats: [],
    transactions: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function loadGuestData(locale: Locale = 'ru'): Promise<GuestData> {
  const stored = await idbGet<GuestData>(CacheKeys.guestData);
  if (!stored || stored.version !== 1) return emptyGuestData(locale);
  return {
    ...emptyGuestData(locale),
    ...stored,
    settings: { ...emptyGuestSettings(locale), ...stored.settings },
    chats: Array.isArray(stored.chats) ? stored.chats : [],
    transactions: Array.isArray(stored.transactions) ? stored.transactions : [],
  };
}

export async function saveGuestData(data: GuestData): Promise<GuestData> {
  const trimmed: GuestData = {
    ...data,
    version: 1,
    chats: data.chats.slice(0, LIMITS.chats).map((chat) => ({
      ...chat,
      messages: chat.messages.slice(-LIMITS.messagesPerChat),
    })),
    transactions: data.transactions.slice(0, LIMITS.transactions),
    updatedAt: new Date().toISOString(),
  };
  await idbSet(CacheKeys.guestData, trimmed);
  return trimmed;
}

export async function clearGuestData(): Promise<void> {
  await idbDel(CacheKeys.guestData);
}

export function guestHasData(data: GuestData): boolean {
  return data.chats.length > 0 || data.transactions.length > 0 || data.settings.balanceMinor > 0;
}

/** Local plan — identical maths to the worker, computed on the device. */
export function guestPlan(data: GuestData, now = new Date().toISOString()): PlanResult {
  return computePlan({
    now,
    timezone: data.settings.timezone,
    balanceMinor: data.settings.balanceMinor,
    currency: data.settings.currency,
    level: data.settings.finance.level,
    savingsRates: data.settings.finance.savingsRates,
    incomes: data.settings.finance.incomes,
    fixedExpenses: data.settings.finance.fixedExpenses,
    expenses: data.transactions
      .filter((tx) => tx.kind === 'expense')
      .map((tx) => ({ amountMinor: tx.amountMinor, occurredAt: tx.occurredAt })),
  });
}

/** A synthetic profile so guest screens can reuse the signed-in components. */
export function guestAsUser(data: GuestData): WebUser {
  return {
    uid: 'guest',
    email: null,
    displayName: null,
    locale: data.settings.locale,
    timezone: data.settings.timezone,
    currency: data.settings.currency,
    theme: 'system',
    madhhab: data.settings.madhhab,
    aiMode: 'builtin',
    consentAt: data.settings.consentAt,
    onboardingDone: true,
    health: data.settings.health,
    finance: data.settings.finance,
    balanceMinor: data.settings.balanceMinor,
    createdAt: new Date().toISOString(),
  };
}

/** Ready-made demo data: shows every feature, including the red plan. */
export function demoGuestData(locale: Locale, currency = DEFAULT_CURRENCY): GuestData {
  const today = localDateISO(new Date().toISOString());
  const day = Number(today.slice(8, 10));
  const clamp = (value: number) => Math.min(28, Math.max(1, value));
  const at = (daysAgo: number, hour = 12) =>
    `${addDays(today, -daysAgo)}T${String(hour).padStart(2, '0')}:30:00.000Z`;

  const transactions: Transaction[] = [
    { id: 'd1', kind: 'expense', amountMinor: 148_000, label: 'Магнит', category: 'groceries', occurredAt: at(0, 10), source: 'manual' },
    { id: 'd2', kind: 'expense', amountMinor: 42_000, label: 'Кофе', category: 'food', occurredAt: at(0, 9), source: 'manual' },
    { id: 'd3', kind: 'expense', amountMinor: 96_000, label: 'Метро', category: 'transport', occurredAt: at(1, 8), source: 'manual' },
    { id: 'd4', kind: 'expense', amountMinor: 235_000, label: 'Аптека', category: 'health', occurredAt: at(2, 18), source: 'manual' },
    { id: 'd5', kind: 'expense', amountMinor: 189_000, label: 'Пятёрочка', category: 'groceries', occurredAt: at(3, 19), source: 'manual' },
    { id: 'd6', kind: 'expense', amountMinor: 65_000, label: 'Такси', category: 'transport', occurredAt: at(4, 22), source: 'manual' },
    { id: 'd7', kind: 'expense', amountMinor: 310_000, label: 'Кино', category: 'entertainment', occurredAt: at(5, 20), source: 'manual' },
    { id: 'd8', kind: 'expense', amountMinor: 127_000, label: 'ВкусВилл', category: 'groceries', occurredAt: at(6, 17), source: 'manual' },
    { id: 'd9', kind: 'income', amountMinor: 4_500_000, label: 'Зарплата', category: 'other', occurredAt: at(20, 12), source: 'income' },
  ];

  return {
    version: 1,
    settings: {
      locale,
      currency,
      timezone: DEFAULT_TIMEZONE,
      madhhab: 'none',
      consentAt: new Date().toISOString(),
      balanceMinor: 1_200_000,
      health: {
        age: 34,
        weightKg: 82,
        heightCm: 178,
        sex: 'male',
        conditions: ['гипертония'],
        medications: ['лизиноприл 10 мг'],
        allergies: ['пенициллин'],
        notes: '',
        updatedAt: new Date().toISOString(),
      },
      finance: {
        currency,
        level: 'normal',
        savingsRates: { hard: 30, normal: 15, easy: 5 },
        incomes: [
          {
            id: 'demo-income',
            label: 'Зарплата',
            amountMinor: 4_500_000,
            cadence: 'monthly',
            lastPayday: today,
            active: true,
          },
        ],
        fixedExpenses: [
          { id: 'demo-rent', label: 'Аренда', amountMinor: 3_000_000, dueDay: clamp(day + 2), active: true },
          { id: 'demo-loan', label: 'Кредит', amountMinor: 1_800_000, dueDay: clamp(day + 5), active: true },
          { id: 'demo-net', label: 'Интернет', amountMinor: 90_000, dueDay: clamp(day + 1), active: true },
        ],
        updatedAt: new Date().toISOString(),
      },
    },
    chats: [
      {
        id: 'demo-chat-1',
        kind: 'shaykh',
        title: 'Fit bar',
        preview: 'Gelatin of unknown origin — doubtful.',
        createdAt: at(2, 14),
        updatedAt: at(2, 14),
        messages: [
          { id: 'm1', role: 'user', content: 'Ingredients: oats, syrup, gelatin, flavouring.', createdAt: at(2, 14) },
          {
            id: 'm2',
            role: 'assistant',
            content:
              'The label lists gelatin but not its source. Gelatin can be porcine, bovine or fish.\n\nUntil the producer confirms the source, the safer ruling is doubtful (mashbooh).',
            createdAt: at(2, 14),
          },
        ],
      },
    ],
    transactions,
    updatedAt: new Date().toISOString(),
  };
}
