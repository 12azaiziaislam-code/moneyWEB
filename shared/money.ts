/**
 * Money helpers — every amount in Baraka is an INTEGER of the smallest unit
 * (kopeks for RUB). No floats are ever used for arithmetic; division is only
 * used for display formatting and is guarded.
 */

import type { Locale } from './types';

/** Minor-unit exponent per currency. RUB/USD/EUR = 2 (kopeks/cents). */
const EXPONENTS: Record<string, number> = {
  RUB: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  KZT: 2,
  UAH: 2,
  BYN: 2,
  TRY: 2,
  AED: 2,
  SAR: 2,
  QAR: 2,
  KWD: 3,
  UZS: 0,
  JPY: 0,
  KRW: 0,
};

export function currencyExponent(currency: string): number {
  return EXPONENTS[currency.toUpperCase()] ?? 2;
}

function normalize(text: string): string {
  return text
    .replace(/[\u00a0\u202f\u2009]/g, ' ')
    .replace(/[^\d.,\-]/g, '')
    .trim();
}

/**
 * Parses a human money string into minor units.
 * Accepts "1 234,56", "1,234.56", "1.234.567,89", "₽ 150", "150 р.", "12.5".
 * Returns null when nothing numeric is found.
 */
export function majorToMinor(raw: string, currency = 'RUB'): number | null {
  if (!raw) return null;
  const exp = currencyExponent(currency);
  let s = normalize(String(raw));
  if (!s) return null;

  let negative = false;
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  }
  s = s.replace(/-/g, '');
  if (!s || !/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let intPart = s;
  let fracPart = '';

  if (lastComma >= 0 && lastDot >= 0) {
    const decSep = lastComma > lastDot ? ',' : '.';
    const thouSep = decSep === ',' ? '.' : ',';
    intPart = s.split(thouSep).join('');
    const i = intPart.lastIndexOf(decSep);
    fracPart = intPart.slice(i + 1);
    intPart = intPart.slice(0, i);
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.';
    const parts = s.split(sep);
    const last = parts[parts.length - 1];
    const integerPart = parts[0] ?? '';
    if (parts.length === 2 && last.length > 0 && last.length <= exp) {
      // "12,5" / "1299.90" -> decimal separator
      intPart = integerPart;
      fracPart = last;
    } else if (parts.length === 2 && last.length === 3 && integerPart.length <= 3) {
      // "1.234" / "999,000" -> thousands separator (ru & us habit)
      intPart = `${integerPart}${last}`;
      fracPart = '';
    } else if (parts.length === 2 && last.length > exp + 1) {
      // "12.3456" -> decimal with more precision than the currency allows
      intPart = integerPart;
      fracPart = last;
    } else {
      // "1.234.567" -> all separators are thousands
      intPart = parts.join('');
      fracPart = '';
    }
  }

  intPart = intPart.replace(/\D/g, '');
  fracPart = fracPart.replace(/\D/g, '');
  if (!intPart && !fracPart) return null;

  const intNum = intPart ? Number.parseInt(intPart, 10) : 0;
  if (!Number.isFinite(intNum)) return null;

  // Round the fraction half-up to the currency exponent.
  const frac = fracPart.slice(0, exp).padEnd(exp, '0');
  let fracNum = exp > 0 && frac ? Number.parseInt(frac, 10) : 0;
  const nextDigit = fracPart.length > exp ? Number.parseInt(fracPart[exp], 10) : 0;
  if (nextDigit >= 5) fracNum += 1;

  const minor = fracNum >= 10 ** exp ? (intNum + 1) * 10 ** exp : intNum * 10 ** exp + fracNum;
  if (!Number.isFinite(minor)) return null;
  return negative ? -minor : minor;
}

/** Converts a JS number in major units to minor units (rounds half-up). */
export function numberToMinor(value: number, currency = 'RUB'): number {
  const exp = currencyExponent(currency);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10 ** exp);
}

/** Minor -> plain decimal string "1234.56" (no grouping, dot separator). */
export function minorToDecimalString(minor: number, currency = 'RUB'): string {
  const exp = currencyExponent(currency);
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(minor));
  if (exp === 0) return `${sign}${abs}`;
  const base = 10 ** exp;
  const int = Math.floor(abs / base);
  const frac = String(abs % base).padStart(exp, '0');
  return `${sign}${int}.${frac}`;
}

/** Formats minor units with Intl for the given locale (correct ₽ / $ placement). */
export function formatMoney(
  minor: number,
  currency: string,
  locale: Locale | string,
  options: { compact?: boolean; showZeroDecimals?: boolean } = {},
): string {
  const exp = currencyExponent(currency);
  const value = minor / 10 ** exp;
  const digits = options.showZeroDecimals ? 0 : exp;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      notation: options.compact ? 'compact' : 'standard',
    }).format(value);
  } catch {
    return `${minorToDecimalString(minor, currency)} ${currency}`;
  }
}

/** Plain grouped number without a currency sign (used for charts / inputs). */
export function formatNumber(minor: number, currency: string, locale: string): string {
  const exp = currencyExponent(currency);
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: exp, minimumFractionDigits: 0 }).format(
      minor / 10 ** exp,
    );
  } catch {
    return minorToDecimalString(minor, currency);
  }
}

export function sumMinor(values: number[]): number {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? Math.trunc(v) : 0), 0);
}

/** Percentage of a goal, clamped to sane bounds, integer. */
export function percentOf(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(999, Math.round((part / whole) * 100)));
}
