/** Haptics + date formatting helpers (Intl driven, timezone aware). */

import { localTimeHM } from '../../shared/payday';

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Short vibration for verdict feedback; silently ignored when unsupported. */
export function haptic(pattern: number | number[] = 14): void {
  if (prefersReducedMotion()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

export const HAPTIC: Record<'tap' | 'success' | 'warning' | 'danger', number | number[]> = {
  tap: 8,
  success: [18, 40, 22],
  warning: [24, 60, 24],
  danger: [40, 70, 40, 70, 60],
};

export function formatDateTime(iso: string, locale: string, timeZone = 'Europe/Moscow'): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

export function formatDate(iso: string, locale: string, timeZone = 'Europe/Moscow'): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatTime(iso: string, locale: string, timeZone = 'Europe/Moscow'): string {
  try {
    return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(new Date(iso));
  } catch {
    return localTimeHM(iso, timeZone);
  }
}

/** "YYYY-MM-DD" (a calendar date, no timezone shift) rendered for humans. */
export function formatCalendarDate(isoDate: string, locale: string): string {
  try {
    const [year, month, day] = isoDate.split('-').map((n) => Number.parseInt(n, 10));
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
  } catch {
    return isoDate;
  }
}

/** Value for <input type="datetime-local"> from an ISO UTC string. */
export function toDateTimeLocal(iso: string, timeZone = 'Europe/Moscow'): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(iso));
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}`;
  } catch {
    return iso.slice(0, 16);
  }
}

/** Converts a datetime-local value (wall clock in `timeZone`) back to UTC ISO. */
export function fromDateTimeLocal(value: string, timeZone = 'Europe/Moscow'): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return new Date().toISOString();
  const [, year, month, day, hour, minute] = match;
  const guess = Date.UTC(+year, +month - 1, +day, +hour, +minute);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date(guess));
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
    const offset = asUtc - guess;
    return new Date(guess - offset).toISOString();
  } catch {
    return new Date(guess).toISOString();
  }
}

export function percent(value: number): string {
  return `${Math.round(value)}%`;
}
