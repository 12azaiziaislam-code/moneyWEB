/**
 * i18next setup: ar (RTL), ru, en. Every UI string lives in src/i18n/*.json —
 * no hardcoded copy inside components.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './ar.json';
import ru from './ru.json';
import en from './en.json';

export type Locale = 'ar' | 'ru' | 'en';
export const LOCALES: Locale[] = ['ar', 'ru', 'en'];
export const LOCALE_STORAGE_KEY = 'baraka.locale';

export const resources = {
  ar: { translation: ar },
  ru: { translation: ru },
  en: { translation: en },
} as const;

function isLocale(value: unknown): value is Locale {
  return value === 'ar' || value === 'ru' || value === 'en';
}

/** First paint language: stored choice → Arabic (default). */
export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* private mode */
  }
  return 'ar';
}

export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export async function changeLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  applyDocumentLocale(locale);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function applyDocumentLocale(locale: Locale): void {
  const dir = dirFor(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
  document.body.dir = dir;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLocale(),
  fallbackLng: 'ar',
  supportedLngs: LOCALES,
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

applyDocumentLocale(detectLocale());

export default i18n;
