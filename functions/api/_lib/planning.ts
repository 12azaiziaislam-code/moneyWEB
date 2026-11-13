/** Shared plan computation for the API (finance + accountant chat context). */

import type { PlanResult, WebUser } from '../../../shared/types';
import { computePlan, type ExpensePoint } from '../../../shared/budget';
import { addDays, localDateISO } from '../../../shared/payday';
import type { Env } from './env';
import { nowISO } from './http';

interface ExpenseRow {
  amount_minor: number;
  occurred_at: string;
}

export async function recentExpenses(env: Env, uid: string, days = 30): Promise<ExpensePoint[]> {
  const today = localDateISO(nowISO());
  const from = addDays(today, -(days - 1));
  const { results } = await env.DB.prepare(
    `SELECT amount_minor, occurred_at FROM transactions
     WHERE uid = ? AND kind = 'expense' AND occurred_at >= ? ORDER BY occurred_at DESC LIMIT 400`,
  )
    .bind(uid, `${from}T00:00:00.000Z`)
    .all<ExpenseRow>();
  return (results ?? []).map((row) => ({ amountMinor: row.amount_minor, occurredAt: row.occurred_at }));
}

export async function buildPlan(env: Env, user: WebUser): Promise<PlanResult> {
  const expenses = await recentExpenses(env, user.uid);
  return computePlan({
    now: nowISO(),
    timezone: user.timezone,
    balanceMinor: user.balanceMinor,
    currency: user.currency,
    level: user.finance.level,
    savingsRates: user.finance.savingsRates,
    incomes: user.finance.incomes,
    fixedExpenses: user.finance.fixedExpenses,
    expenses,
  });
}
