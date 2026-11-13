/**
 * Payday scheduling — pure, deterministic, UTC based.
 * Dates are handled as calendar strings "YYYY-MM-DD" to avoid timezone drift.
 */

import type { FixedExpense, IncomeSource } from './types';

const DAY_MS = 86_400_000;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "YYYY-MM-DD" -> UTC midnight ms */
export function parseISODate(iso: string): number {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map((n) => Number.parseInt(n, 10));
  if (!y || !m || !d) return Number.NaN;
  return Date.UTC(y, m - 1, d);
}

export function isoFromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return isoFromUTC(parseISODate(iso) + days * DAY_MS);
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((parseISODate(toISO) - parseISODate(fromISO)) / DAY_MS);
}

export function isValidISODate(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && Number.isFinite(parseISODate(iso));
}

/** Today's calendar date in the user's timezone (default: Europe/Moscow). */
export function localDateISO(now: string | Date, timeZone = 'Europe/Moscow'): string {
  const d = typeof now === 'string' ? new Date(now) : now;
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const iso = `${get('year')}-${get('month')}-${get('day')}`;
    return isValidISODate(iso) ? iso : d.toISOString().slice(0, 10);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Local wall-clock "HH:mm" in the given timezone. */
export function localTimeHM(now: string | Date, timeZone = 'Europe/Moscow'): string {
  const d = typeof now === 'string' ? new Date(now) : now;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  }
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Clamps the day to the real length of the month (31 -> 30/28). */
export function dateInMonth(year: number, monthIndex: number, day: number): string {
  const clamped = Math.max(1, Math.min(day, daysInMonth(year, monthIndex)));
  return `${year}-${pad2(monthIndex + 1)}-${pad2(clamped)}`;
}

function monthIndexFrom(idx: number): { year: number; month: number } {
  return { year: Math.floor(idx / 12), month: ((idx % 12) + 12) % 12 };
}

/**
 * Returns the next `count` paydays strictly AFTER `fromISO` for one income source.
 * Handles weekly / biweekly / semimonthly (two fixed days) / monthly / quarterly /
 * custom (any number of days per month), with day-of-month clamping.
 */
export function nextPaydays(source: IncomeSource, fromISO: string, count = 6): string[] {
  if (!source || source.active === false) return [];
  if (!isValidISODate(source.lastPayday) || !isValidISODate(fromISO)) return [];
  const from = parseISODate(fromISO);
  const anchor = parseISODate(source.lastPayday);
  const anchorDate = new Date(anchor);
  const out: string[] = [];
  const max = Math.max(1, Math.min(count, 24));

  if (source.cadence === 'weekly' || source.cadence === 'biweekly') {
    const step = (source.cadence === 'weekly' ? 7 : 14) * DAY_MS;
    let cursor = anchor;
    let guard = 0;
    while (cursor <= from && guard++ < 1000) cursor += step;
    while (out.length < max && out.length < 60) {
      out.push(isoFromUTC(cursor));
      cursor += step;
    }
    return out;
  }

  if (source.cadence === 'monthly' || source.cadence === 'quarterly') {
    const stepMonths = source.cadence === 'monthly' ? 1 : 3;
    const day = anchorDate.getUTCDate();
    let idx = anchorDate.getUTCFullYear() * 12 + anchorDate.getUTCMonth();
    let candidate = dateInMonth(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), day);
    let guard = 0;
    while (parseISODate(candidate) <= from && guard++ < 600) {
      idx += stepMonths;
      const { year, month } = monthIndexFrom(idx);
      candidate = dateInMonth(year, month, day);
    }
    while (out.length < max) {
      out.push(candidate);
      idx += stepMonths;
      const { year, month } = monthIndexFrom(idx);
      candidate = dateInMonth(year, month, day);
    }
    return out;
  }

  // semimonthly & custom: several fixed days per month
  const rawDays =
    source.cadence === 'custom' && source.customDays && source.customDays.length
      ? source.customDays
      : [source.day1, source.day2];
  const days = Array.from(
    new Set(
      rawDays.filter((d): d is number => typeof d === 'number' && d >= 1 && d <= 31).sort((a, b) => a - b),
    ),
  );
  if (!days.length) return [];

  const start = new Date(from);
  let idx = start.getUTCFullYear() * 12 + start.getUTCMonth() - 1;
  let guard = 0;
  while (out.length < max && guard++ < 240) {
    const { year, month } = monthIndexFrom(idx);
    for (const d of days) {
      if (out.length >= max) break;
      const candidate = dateInMonth(year, month, d);
      if (parseISODate(candidate) > from) out.push(candidate);
    }
    idx += 1;
  }
  return out;
}

export interface PaydayEvent {
  date: string;
  label: string;
  amountMinor: number;
  sourceId: string;
}

/** All upcoming paydays from every active source, merged and sorted. */
export function salaryEvents(sources: IncomeSource[], fromISO: string, count = 6): PaydayEvent[] {
  const events: PaydayEvent[] = [];
  for (const source of sources ?? []) {
    if (!source || source.active === false) continue;
    for (const date of nextPaydays(source, fromISO, count)) {
      events.push({
        date,
        label: source.label,
        amountMinor: Math.trunc(source.amountMinor || 0),
        sourceId: source.id,
      });
    }
  }
  return events
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(0, Math.max(1, count));
}

export function nextPaydayDate(sources: IncomeSource[], fromISO: string): string | null {
  const [first] = salaryEvents(sources, fromISO, 1);
  return first ? first.date : null;
}

/** Fixed expenses falling due inside (fromISO, toISO]. */
export function upcomingFixedExpenses(
  expenses: FixedExpense[],
  fromISO: string,
  toISO: string,
): { date: string; label: string; amountMinor: number }[] {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  const result: { date: string; label: string; amountMinor: number }[] = [];
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return result;

  const start = new Date(from);
  for (let offset = -1; offset <= 2; offset += 1) {
    const idx = start.getUTCFullYear() * 12 + start.getUTCMonth() + offset;
    const { year, month } = monthIndexFrom(idx);
    for (const expense of expenses ?? []) {
      if (!expense || expense.active === false) continue;
      const dueDay = Math.max(1, Math.min(31, Math.trunc(expense.dueDay || 1)));
      const date = dateInMonth(year, month, dueDay);
      const ms = parseISODate(date);
      if (ms > from && ms <= to) {
        result.push({ date, label: expense.label, amountMinor: Math.trunc(expense.amountMinor || 0) });
      }
    }
  }
  return result.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
