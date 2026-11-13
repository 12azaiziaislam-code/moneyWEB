/**
 * Budget engine — the heart of the accountant. 100% pure functions, unit tested.
 * All maths in minor units; the only division is for display/day allocation.
 */

import { sumMinor } from './money';
import {
  addDays,
  daysBetween,
  localDateISO,
  parseISODate,
  salaryEvents,
  upcomingFixedExpenses,
} from './payday';
import type { DangerLevel, FixedExpense, IncomeSource, PlanResult, SavingsRates, SpendLevel } from './types';

export const DEFAULT_SAVINGS_RATES: SavingsRates = { hard: 30, normal: 15, easy: 5 };

export interface ExpensePoint {
  amountMinor: number;
  occurredAt: string;
}

export interface PlanInput {
  now: string;
  timezone?: string;
  balanceMinor: number;
  currency?: string;
  level?: SpendLevel;
  savingsRates?: SavingsRates;
  incomes?: IncomeSource[];
  fixedExpenses?: FixedExpense[];
  /** Recent EXPENSE transactions (kind = 'expense'), any order. */
  expenses?: ExpensePoint[];
}

function clampPercent(value: number | undefined, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(90, Math.round(n)));
}

/** Normalises any cadence to a monthly amount (integer minor units). */
export function monthlyIncomeMinor(incomes: IncomeSource[]): number {
  let total = 0;
  for (const income of incomes ?? []) {
    if (!income || income.active === false) continue;
    const amount = Math.trunc(income.amountMinor || 0);
    switch (income.cadence) {
      case 'weekly':
        total += Math.round((amount * 52) / 12);
        break;
      case 'biweekly':
        total += Math.round((amount * 26) / 12);
        break;
      case 'semimonthly':
        total += amount * 2;
        break;
      case 'quarterly':
        total += Math.round(amount / 3);
        break;
      case 'custom':
        total += amount * Math.max(1, (income.customDays ?? []).length);
        break;
      case 'monthly':
      default:
        total += amount;
    }
  }
  return total;
}

export function monthlyFixedMinor(fixedExpenses: FixedExpense[]): number {
  return sumMinor((fixedExpenses ?? []).filter((f) => f && f.active !== false).map((f) => f.amountMinor));
}

export function recommendLevel(input: {
  monthlyIncomeMinor: number;
  monthlyFixedMinor: number;
  balanceMinor: number;
}): { level: SpendLevel; reason: 'no_income' | 'fixed_heavy' | 'tight' | 'balanced' | 'comfortable' } {
  const income = Math.max(0, input.monthlyIncomeMinor);
  const fixed = Math.max(0, input.monthlyFixedMinor);
  const balance = Math.max(0, input.balanceMinor);
  if (income <= 0) return { level: 'hard', reason: 'no_income' };
  const ratio = fixed / income;
  if (ratio >= 0.65) return { level: 'hard', reason: 'fixed_heavy' };
  if (ratio >= 0.45) return { level: 'normal', reason: 'tight' };
  if (ratio < 0.3 && balance >= fixed * 2) return { level: 'easy', reason: 'comfortable' };
  return { level: 'normal', reason: 'balanced' };
}

/** The money cycle: from today until the next expected payday (or +30 days). */
export function cycleWindow(
  incomes: IncomeSource[],
  nowISO: string,
  timezone = 'Europe/Moscow',
): { start: string; end: string; daysLeft: number } {
  const today = localDateISO(nowISO, timezone);
  const events = salaryEvents(incomes, today, 1);
  const end = events.length ? events[0].date : addDays(today, 30);
  const daysLeft = Math.max(1, daysBetween(today, end) + 1);
  return { start: today, end, daysLeft };
}

export function computePlan(input: PlanInput): PlanResult {
  const tz = input.timezone || 'Europe/Moscow';
  const today = localDateISO(input.now, tz);
  const incomes = input.incomes ?? [];
  const fixedExpenses = input.fixedExpenses ?? [];
  const expenses = input.expenses ?? [];
  const level = input.level ?? 'normal';
  const rates = input.savingsRates ?? DEFAULT_SAVINGS_RATES;
  const rate = clampPercent(rates[level], DEFAULT_SAVINGS_RATES[level]);
  const currency = (input.currency || 'RUB').toUpperCase();

  const paydayList = salaryEvents(incomes, today, 8);
  const cycleEnd = paydayList.length ? paydayList[0].date : addDays(today, 30);
  const daysLeft = Math.max(1, daysBetween(today, cycleEnd) + 1);

  const inCycle = paydayList.filter((p) => p.date <= cycleEnd);
  const expectedIncomeMinor = sumMinor(inCycle.map((p) => p.amountMinor));

  const fixedDue = upcomingFixedExpenses(fixedExpenses, today, cycleEnd);
  const remainingFixedMinor = sumMinor(fixedDue.map((f) => f.amountMinor));

  const savingsBase = expectedIncomeMinor > 0 ? expectedIncomeMinor : Math.max(0, input.balanceMinor);
  const savingsTargetMinor = Math.round((savingsBase * rate) / 100);

  const availableMinor =
    Math.trunc(input.balanceMinor) + expectedIncomeMinor - remainingFixedMinor - savingsTargetMinor;

  const dailyBudgetMinor = Math.max(0, Math.floor(Math.max(0, availableMinor) / daysLeft));

  const spentTodayMinor = sumMinor(
    expenses.filter((e) => localDateISO(e.occurredAt, tz) === today).map((e) => e.amountMinor),
  );

  const windowDays = 14;
  const windowStart = addDays(today, -(windowDays - 1));
  const windowSum = sumMinor(
    expenses
      .filter((e) => {
        const day = localDateISO(e.occurredAt, tz);
        return day >= windowStart && day <= today;
      })
      .map((e) => e.amountMinor),
  );
  const averageDailySpendMinor = Math.round(windowSum / windowDays);

  const rawRatio = dailyBudgetMinor > 0 ? spentTodayMinor / dailyBudgetMinor : spentTodayMinor > 0 ? 99 : 0;
  const todayRatio = Math.min(99, Math.round(rawRatio * 100) / 100);

  const afterTodayMinor = availableMinor - spentTodayMinor;
  const daysAfterToday = Math.max(0, daysLeft - 1);
  const nextDailyBudgetMinor =
    daysAfterToday > 0 ? Math.max(0, Math.floor(Math.max(0, afterTodayMinor) / daysAfterToday)) : 0;
  const savingsProjectedMinor = Math.max(
    0,
    Math.min(savingsTargetMinor, savingsTargetMinor + Math.min(0, afterTodayMinor)),
  );

  let projectedRunOutDate: string | null = null;
  let daysWithoutMoney = 0;
  if (availableMinor < 0) {
    projectedRunOutDate = today;
    daysWithoutMoney = daysLeft;
  } else if (averageDailySpendMinor > 0) {
    const offset = Math.floor(availableMinor / averageDailySpendMinor);
    const date = addDays(today, Math.min(offset, 3650));
    if (offset < daysLeft && parseISODate(date) < parseISODate(cycleEnd)) {
      projectedRunOutDate = date;
      daysWithoutMoney = Math.max(0, daysBetween(date, cycleEnd));
    }
  }

  let danger: DangerLevel;
  if (availableMinor < 0 || projectedRunOutDate !== null || todayRatio > 2) danger = 'red';
  else if (todayRatio > 1.3) danger = 'orange';
  else if (todayRatio > 1) danger = 'yellow';
  else danger = 'green';

  return {
    currency,
    level,
    danger,
    cycleStart: today,
    cycleEnd,
    daysLeft,
    balanceMinor: Math.trunc(input.balanceMinor),
    expectedIncomeMinor,
    remainingFixedMinor,
    savingsTargetMinor,
    availableMinor,
    dailyBudgetMinor,
    nextDailyBudgetMinor,
    spentTodayMinor,
    spentCycleMinor: spentTodayMinor,
    todayRatio,
    savingsProjectedMinor,
    projectedRunOutDate,
    daysWithoutMoney,
    averageDailySpendMinor,
    paydays: inCycle,
    upcomingFixed: fixedDue,
  };
}
