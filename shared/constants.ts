/** Shared constants (client + worker). Keys are translated through i18n. */

import type { Locale } from './types';

export const SUPPORTED_LOCALES: Locale[] = ['ar', 'ru', 'en'];

export const SUPPORTED_CURRENCIES = ['RUB', 'USD', 'EUR', 'KZT', 'TRY', 'AED', 'SAR', 'GBP'] as const;
export const DEFAULT_CURRENCY = 'RUB';
export const DEFAULT_TIMEZONE = 'Europe/Moscow';

export const LOCALE_DIR: Record<Locale, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  ru: 'ltr',
  en: 'ltr',
};

export const LOCALE_LABEL: Record<Locale, string> = {
  ar: 'العربية',
  ru: 'Русский',
  en: 'English',
};

/** Expense categories — translation keys live under `categories.*`. */
export const EXPENSE_CATEGORIES = [
  'food',
  'groceries',
  'transport',
  'housing',
  'utilities',
  'health',
  'education',
  'clothing',
  'entertainment',
  'subscriptions',
  'debt',
  'charity',
  'family',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Ready-made fixed expenses — translation keys live under `fixed.*`. */
export const FIXED_EXPENSE_PRESETS = [
  { key: 'rent', dueDay: 5 },
  { key: 'electricity', dueDay: 15 },
  { key: 'gas', dueDay: 20 },
  { key: 'water', dueDay: 20 },
  { key: 'internet', dueDay: 10 },
  { key: 'mobile', dueDay: 10 },
  { key: 'transport', dueDay: 1 },
  { key: 'subscriptions', dueDay: 1 },
  { key: 'loan', dueDay: 25 },
  { key: 'kindergarten', dueDay: 10 },
  { key: 'insurance', dueDay: 28 },
] as const;

export const IMAGE_LIMITS = {
  maxDim: 1280,
  quality: 0.8,
  maxUploadBytes: 1_200_000,
  accepted: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
} as const;

export const APP_NAME_EN = 'Baraka';
export const MAX_CHAT_TITLE = 80;
export const MAX_MESSAGE_CHARS = 4000;
