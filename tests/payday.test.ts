import { describe, expect, it } from 'vitest';
import type { FixedExpense, IncomeSource } from '../shared/types';
import {
  addDays,
  dateInMonth,
  daysBetween,
  localDateISO,
  nextPaydays,
  salaryEvents,
  upcomingFixedExpenses,
} from '../shared/payday';

const base: IncomeSource = {
  id: 'inc1',
  label: 'Salary',
  amountMinor: 6_000_000,
  cadence: 'monthly',
  lastPayday: '2026-10-25',
  active: true,
};

describe('payday: cadences', () => {
  it('monthly keeps the day-of-month and clamps short months', () => {
    const source: IncomeSource = { ...base, lastPayday: '2026-01-31' };
    expect(nextPaydays(source, '2026-02-01', 3)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('monthly from the payday itself jumps to the next month', () => {
    expect(nextPaydays(base, '2026-10-25', 2)).toEqual(['2026-11-25', '2026-12-25']);
  });

  it('weekly and biweekly advance by fixed days', () => {
    const weekly: IncomeSource = { ...base, cadence: 'weekly', lastPayday: '2026-10-27' };
    expect(nextPaydays(weekly, '2026-11-02', 2)).toEqual(['2026-11-03', '2026-11-10']);

    const biweekly: IncomeSource = { ...base, cadence: 'biweekly', lastPayday: '2026-10-20' };
    expect(nextPaydays(biweekly, '2026-11-02', 2)).toEqual(['2026-11-03', '2026-11-17']);
  });

  it('semimonthly returns both fixed days', () => {
    const source: IncomeSource = { ...base, cadence: 'semimonthly', day1: 10, day2: 25 };
    expect(nextPaydays(source, '2026-11-02', 3)).toEqual(['2026-11-10', '2026-11-25', '2026-12-10']);
  });

  it('custom days are merged, sorted and de-duplicated', () => {
    const source: IncomeSource = { ...base, cadence: 'custom', customDays: [28, 5, 5] };
    expect(nextPaydays(source, '2026-11-02', 3)).toEqual(['2026-11-05', '2026-11-28', '2026-12-05']);
  });

  it('quarterly advances three months', () => {
    const source: IncomeSource = { ...base, cadence: 'quarterly', lastPayday: '2026-01-15' };
    expect(nextPaydays(source, '2026-11-02', 2)).toEqual(['2027-01-15', '2027-04-15']);
  });

  it('ignores inactive sources and invalid dates', () => {
    expect(nextPaydays({ ...base, active: false }, '2026-11-02', 2)).toEqual([]);
    expect(nextPaydays({ ...base, lastPayday: 'not-a-date' }, '2026-11-02', 2)).toEqual([]);
  });

  it('handles a future anchor date (first payday not yet reached)', () => {
    expect(nextPaydays({ ...base, lastPayday: '2026-12-10' }, '2026-11-02', 2)).toEqual([
      '2026-12-10',
      '2027-01-10',
    ]);
  });
});

describe('payday: aggregation helpers', () => {
  const incomes: IncomeSource[] = [
    base,
    { ...base, id: 'inc2', label: 'Side', amountMinor: 1_500_000, cadence: 'weekly', lastPayday: '2026-10-30' },
  ];

  it('merges paydays from every source in date order', () => {
    const events = salaryEvents(incomes, '2026-11-02', 4);
    expect(events.map((event) => event.date)).toEqual(['2026-11-06', '2026-11-13', '2026-11-20', '2026-11-25']);
    expect(events[0]).toMatchObject({ label: 'Side', amountMinor: 1_500_000, sourceId: 'inc2' });
    expect(events[3]).toMatchObject({ label: 'Salary', amountMinor: 6_000_000, sourceId: 'inc1' });
  });

  it('lists fixed expenses due inside the window only', () => {
    const expenses: FixedExpense[] = [
      { id: 'f2', label: 'Utilities', amountMinor: 500_000, dueDay: 20, active: true },
      { id: 'f1', label: 'Rent', amountMinor: 3_000_000, dueDay: 5, active: true },
      { id: 'f3', label: 'Off', amountMinor: 100, dueDay: 15, active: false },
    ];
    const due = upcomingFixedExpenses(expenses, '2026-11-02', '2026-11-25');
    expect(due.map((item) => item.label)).toEqual(['Rent', 'Utilities']);
    expect(due[0].date).toBe('2026-11-05');
    expect(upcomingFixedExpenses(expenses, '2026-11-02', '2026-11-04')).toEqual([]);
  });
});

describe('payday: date primitives', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-11-02', '2026-11-25')).toBe(23);
  });

  it('clamps the day to the real month length', () => {
    expect(dateInMonth(2026, 1, 31)).toBe('2026-02-28');
    expect(dateInMonth(2028, 1, 31)).toBe('2028-02-29');
  });

  it('computes the local calendar date for a timezone', () => {
    // 2026-11-01T22:30Z is already 2026-11-02 in Moscow (UTC+3)
    expect(localDateISO('2026-11-01T22:30:00.000Z', 'Europe/Moscow')).toBe('2026-11-02');
    expect(localDateISO('2026-11-01T22:30:00.000Z', 'UTC')).toBe('2026-11-01');
  });
});
