import { describe, expect, it } from 'vitest';
import { computePlan, cycleWindow, monthlyIncomeMinor, recommendLevel } from '../shared/budget';
import type { FixedExpense, IncomeSource } from '../shared/types';

const salary: IncomeSource = {
  id: 'salary',
  label: 'Salary',
  amountMinor: 6_000_000, // 60 000.00 ₽
  cadence: 'monthly',
  lastPayday: '2026-10-25',
  active: true,
};

const rent: FixedExpense = { id: 'rent', label: 'Rent', amountMinor: 3_000_000, dueDay: 5, active: true };

const baseInput = {
  now: '2026-11-02T09:00:00.000Z',
  timezone: 'UTC',
  balanceMinor: 3_000_000,
  currency: 'RUB',
  level: 'normal' as const,
  savingsRates: { hard: 30, normal: 15, easy: 5 },
  incomes: [salary],
  fixedExpenses: [rent],
  expenses: [],
};

describe('budget: cycle and daily budget', () => {
  it('builds the cycle from today to the next payday', () => {
    expect(cycleWindow([salary], baseInput.now, 'UTC')).toEqual({
      start: '2026-11-02',
      end: '2026-11-25',
      daysLeft: 24,
    });
  });

  it('computes the daily budget exactly as documented', () => {
    const plan = computePlan(baseInput);
    expect(plan.cycleEnd).toBe('2026-11-25');
    expect(plan.daysLeft).toBe(24);
    expect(plan.expectedIncomeMinor).toBe(6_000_000);
    expect(plan.remainingFixedMinor).toBe(3_000_000);
    expect(plan.savingsTargetMinor).toBe(900_000); // 15% of income
    expect(plan.availableMinor).toBe(5_100_000); // 3M + 6M − 3M − 0.9M
    expect(plan.dailyBudgetMinor).toBe(212_500); // floor(5.1M / 24)
    expect(plan.danger).toBe('green');
    expect(plan.spentTodayMinor).toBe(0);
  });

  it('uses the balance as savings base when there is no expected income', () => {
    const plan = computePlan({ ...baseInput, incomes: [], fixedExpenses: [] });
    expect(plan.cycleEnd).toBe('2026-12-02'); // today + 30 days
    expect(plan.expectedIncomeMinor).toBe(0);
    expect(plan.savingsTargetMinor).toBe(450_000); // 15% of the balance
  });

  it('respects the savings rate of each level', () => {
    expect(computePlan({ ...baseInput, level: 'hard' }).savingsTargetMinor).toBe(1_800_000);
    expect(computePlan({ ...baseInput, level: 'easy' }).savingsTargetMinor).toBe(300_000);
  });
});

describe('budget: overspending behaviour', () => {
  const spendToday = (minor: number) => [{ amountMinor: minor, occurredAt: '2026-11-02T08:00:00.000Z' }];

  it('turns yellow just above the daily budget', () => {
    const plan = computePlan({ ...baseInput, expenses: spendToday(230_000) });
    expect(plan.todayRatio).toBeCloseTo(1.08, 2);
    expect(plan.danger).toBe('yellow');
  });

  it('turns orange at 130–200% and redistributes the remaining days', () => {
    const plan = computePlan({ ...baseInput, expenses: spendToday(400_000) });
    expect(plan.todayRatio).toBeCloseTo(1.88, 2);
    expect(plan.danger).toBe('orange');
    expect(plan.nextDailyBudgetMinor).toBe(Math.floor((5_100_000 - 400_000) / 23));
    expect(plan.savingsProjectedMinor).toBe(900_000);
  });

  it('eats the savings first and turns red above 200%', () => {
    const plan = computePlan({ ...baseInput, expenses: spendToday(5_400_000) });
    expect(plan.danger).toBe('red');
    expect(plan.savingsProjectedMinor).toBeLessThan(900_000);
    expect(plan.savingsProjectedMinor).toBeGreaterThanOrEqual(0);
  });

  it('flags a negative available amount immediately', () => {
    const plan = computePlan({ ...baseInput, balanceMinor: 0, fixedExpenses: [rent], incomes: [] });
    expect(plan.availableMinor).toBeLessThan(0);
    expect(plan.danger).toBe('red');
    expect(plan.dailyBudgetMinor).toBe(0);
    expect(plan.projectedRunOutDate).toBe('2026-11-02');
    expect(plan.daysWithoutMoney).toBe(plan.daysLeft);
  });
});

describe('budget: projection', () => {
  it('projects the run-out date from the average spend', () => {
    const expenses = Array.from({ length: 14 }, () => ({
      amountMinor: 500_000,
      occurredAt: '2026-11-01T10:00:00.000Z',
    }));
    const plan = computePlan({ ...baseInput, expenses, balanceMinor: 6_000_000 });
    expect(plan.averageDailySpendMinor).toBeGreaterThan(0);
    expect(plan.danger).toBe('red');
    expect(plan.projectedRunOutDate).not.toBeNull();
    expect(plan.daysWithoutMoney).toBeGreaterThan(0);
  });

  it('does not invent a run-out date when spending is sustainable', () => {
    const plan = computePlan({
      ...baseInput,
      expenses: [{ amountMinor: 50_000, occurredAt: '2026-11-02T08:00:00.000Z' }],
    });
    expect(plan.projectedRunOutDate).toBeNull();
    expect(plan.daysWithoutMoney).toBe(0);
  });
});

describe('budget: recommendations and normalisation', () => {
  it('normalises cadences to a monthly amount', () => {
    expect(monthlyIncomeMinor([salary])).toBe(6_000_000);
    expect(monthlyIncomeMinor([{ ...salary, cadence: 'semimonthly', amountMinor: 1_000_000 }])).toBe(2_000_000);
    expect(monthlyIncomeMinor([{ ...salary, cadence: 'weekly', amountMinor: 700_000 }])).toBe(3_033_333);
    expect(monthlyIncomeMinor([{ ...salary, cadence: 'quarterly', amountMinor: 9_000_000 }])).toBe(3_000_000);
  });

  it('recommends a level from the fixed-costs ratio', () => {
    expect(recommendLevel({ monthlyIncomeMinor: 0, monthlyFixedMinor: 0, balanceMinor: 0 })).toEqual({
      level: 'hard',
      reason: 'no_income',
    });
    expect(
      recommendLevel({ monthlyIncomeMinor: 5_000_000, monthlyFixedMinor: 4_000_000, balanceMinor: 0 }),
    ).toEqual({ level: 'hard', reason: 'fixed_heavy' });
    expect(
      recommendLevel({ monthlyIncomeMinor: 10_000_000, monthlyFixedMinor: 5_000_000, balanceMinor: 0 }),
    ).toEqual({ level: 'normal', reason: 'tight' });
    expect(
      recommendLevel({ monthlyIncomeMinor: 10_000_000, monthlyFixedMinor: 1_000_000, balanceMinor: 5_000_000 }),
    ).toEqual({ level: 'easy', reason: 'comfortable' });
  });
});
