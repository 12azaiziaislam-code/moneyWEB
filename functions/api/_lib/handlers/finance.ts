/** Finance: plan, balance, transactions, and payday confirmations. */

import { addDays, localDateISO, salaryEvents } from '../../../../shared/payday';
import type { Transaction } from '../../../../shared/types';
import { updateUser, getUser } from '../db';
import { HttpError, jsonResponse, nowISO, randomId } from '../http';
import { buildPlan } from '../planning';
import type { RequestContext } from '../router';
import {
  balanceSchema,
  confirmIncomeSchema,
  financeSchema,
  idSchema,
  transactionCreateSchema,
  transactionPatchSchema,
  transactionsBulkSchema,
} from '../schemas';

interface TxRow {
  id: string;
  kind: string;
  amount_minor: number;
  label: string;
  category: string;
  occurred_at: string;
  source: string;
  hash: string | null;
}

function mapTx(row: TxRow): Transaction {
  return {
    id: row.id,
    kind: row.kind === 'income' ? 'income' : 'expense',
    amountMinor: row.amount_minor,
    label: row.label,
    category: row.category,
    occurredAt: row.occurred_at,
    source: (row.source as Transaction['source']) ?? 'manual',
    hash: row.hash ?? null,
  };
}

async function recentTransactions(ctx: RequestContext, limit = 50): Promise<Transaction[]> {
  const { results } = await ctx.env.DB.prepare(
    `SELECT id, kind, amount_minor, label, category, occurred_at, source, hash FROM transactions
     WHERE uid = ? ORDER BY occurred_at DESC LIMIT ?`,
  )
    .bind(ctx.auth.uid, Math.min(200, Math.max(1, limit)))
    .all<TxRow>();
  return (results ?? []).map(mapTx);
}

export async function getFinance(ctx: RequestContext): Promise<Response> {
  const plan = await buildPlan(ctx.env, ctx.user);
  const transactions = await recentTransactions(ctx, 50);
  return jsonResponse({ user: ctx.user, plan, transactions }, ctx.request, ctx.config);
}

export async function putFinance(ctx: RequestContext): Promise<Response> {
  const finance = await ctx.parseBody(financeSchema);
  const user = await updateUser(ctx.env.DB, ctx.auth.uid, {
    finance: { ...finance, updatedAt: nowISO() },
    currency: finance.currency,
  });
  if (!user) throw new HttpError(404, 'not_found', 'Account not found.');
  const plan = await buildPlan(ctx.env, user);
  return jsonResponse({ user, plan }, ctx.request, ctx.config);
}

export async function getPlan(ctx: RequestContext): Promise<Response> {
  const plan = await buildPlan(ctx.env, ctx.user);
  return jsonResponse({ plan }, ctx.request, ctx.config);
}

export async function listTransactions(ctx: RequestContext): Promise<Response> {
  const limit = Number.parseInt(ctx.url.searchParams.get('limit') ?? '50', 10);
  const transactions = await recentTransactions(ctx, Number.isFinite(limit) ? limit : 50);
  return jsonResponse({ transactions }, ctx.request, ctx.config);
}

async function applyBalanceDelta(ctx: RequestContext, deltaMinor: number): Promise<void> {
  const next = Math.max(0, ctx.user.balanceMinor + deltaMinor);
  await ctx.env.DB.prepare('UPDATE users SET balance_minor = ?, updated_at = ? WHERE uid = ?')
    .bind(next, nowISO(), ctx.auth.uid)
    .run();
}

export async function createTransaction(ctx: RequestContext): Promise<Response> {
  const input = await ctx.parseBody(transactionCreateSchema);
  const id = randomId('tx');
  const ts = nowISO();
  await ctx.env.DB.prepare(
    `INSERT INTO transactions (id, uid, kind, amount_minor, label, category, occurred_at, source, hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?)`,
  )
    .bind(id, ctx.auth.uid, input.kind, input.amountMinor, input.label, input.category, input.occurredAt, input.hash ?? null, ts)
    .run();
  await applyBalanceDelta(ctx, input.kind === 'expense' ? -input.amountMinor : input.amountMinor);

  const fresh = (await getUser(ctx.env.DB, ctx.auth.uid)) ?? ctx.user;
  const plan = await buildPlan(ctx.env, fresh);
  const tx: Transaction = {
    id,
    kind: input.kind,
    amountMinor: input.amountMinor,
    label: input.label,
    category: input.category,
    occurredAt: input.occurredAt,
    source: 'manual',
    hash: input.hash ?? null,
  };
  return jsonResponse({ transaction: tx, plan, balanceMinor: fresh.balanceMinor }, ctx.request, ctx.config, 201);
}

export async function createTransactionsBulk(ctx: RequestContext): Promise<Response> {
  const { items } = await ctx.parseBody(transactionsBulkSchema);
  const ts = nowISO();
  const created: Transaction[] = [];
  let delta = 0;

  for (const item of items) {
    const id = randomId('tx');
    await ctx.env.DB.prepare(
      `INSERT INTO transactions (id, uid, kind, amount_minor, label, category, occurred_at, source, hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scan', ?, ?)`,
    )
      .bind(id, ctx.auth.uid, item.kind, item.amountMinor, item.label, item.category, item.occurredAt, item.hash ?? null, ts)
      .run();
    delta += item.kind === 'expense' ? -item.amountMinor : item.amountMinor;
    created.push({
      id,
      kind: item.kind,
      amountMinor: item.amountMinor,
      label: item.label,
      category: item.category,
      occurredAt: item.occurredAt,
      source: 'scan',
      hash: item.hash ?? null,
    });
  }

  if (delta !== 0) await applyBalanceDelta(ctx, delta);
  const fresh = (await getUser(ctx.env.DB, ctx.auth.uid)) ?? ctx.user;
  const plan = await buildPlan(ctx.env, fresh);
  return jsonResponse(
    { transactions: created, plan, balanceMinor: fresh.balanceMinor },
    ctx.request,
    ctx.config,
    201,
  );
}

export async function patchTransaction(ctx: RequestContext): Promise<Response> {
  const id = idSchema.parse(ctx.params.id);
  const patch = await ctx.parseBody(transactionPatchSchema);

  const existing = await ctx.env.DB.prepare(
    'SELECT id, kind, amount_minor, label, category, occurred_at FROM transactions WHERE id = ? AND uid = ?',
  )
    .bind(id, ctx.auth.uid)
    .first<TxRow>();
  if (!existing) throw new HttpError(404, 'not_found', 'Transaction not found.');

  const nextKind = patch.kind ?? (existing.kind === 'income' ? 'income' : 'expense');
  const nextAmount = patch.amountMinor ?? existing.amount_minor;
  const nextLabel = patch.label ?? existing.label;
  const nextCategory = patch.category ?? existing.category;
  const nextDate = patch.occurredAt ?? existing.occurred_at;

  await ctx.env.DB.prepare(
    `UPDATE transactions SET kind = ?, amount_minor = ?, label = ?, category = ?, occurred_at = ?
     WHERE id = ? AND uid = ?`,
  )
    .bind(nextKind, nextAmount, nextLabel, nextCategory, nextDate, id, ctx.auth.uid)
    .run();

  // Keep the balance consistent with the edited row.
  const before = existing.kind === 'expense' ? -existing.amount_minor : existing.amount_minor;
  const after = nextKind === 'expense' ? -nextAmount : nextAmount;
  if (after !== before) await applyBalanceDelta(ctx, after - before);

  const fresh = (await getUser(ctx.env.DB, ctx.auth.uid)) ?? ctx.user;
  const plan = await buildPlan(ctx.env, fresh);
  return jsonResponse({ ok: true, plan, balanceMinor: fresh.balanceMinor }, ctx.request, ctx.config);
}

export async function deleteTransaction(ctx: RequestContext): Promise<Response> {
  const id = idSchema.parse(ctx.params.id);
  const existing = await ctx.env.DB.prepare(
    'SELECT id, kind, amount_minor FROM transactions WHERE id = ? AND uid = ?',
  )
    .bind(id, ctx.auth.uid)
    .first<{ id: string; kind: string; amount_minor: number }>();
  if (!existing) throw new HttpError(404, 'not_found', 'Transaction not found.');

  await ctx.env.DB.prepare('DELETE FROM transactions WHERE id = ? AND uid = ?').bind(id, ctx.auth.uid).run();
  const revert = existing.kind === 'expense' ? existing.amount_minor : -existing.amount_minor;
  await applyBalanceDelta(ctx, revert);

  const fresh = (await getUser(ctx.env.DB, ctx.auth.uid)) ?? ctx.user;
  const plan = await buildPlan(ctx.env, fresh);
  return jsonResponse({ ok: true, plan, balanceMinor: fresh.balanceMinor }, ctx.request, ctx.config);
}

export async function setBalance(ctx: RequestContext): Promise<Response> {
  const { balanceMinor } = await ctx.parseBody(balanceSchema);
  const user = await updateUser(ctx.env.DB, ctx.auth.uid, { balanceMinor });
  if (!user) throw new HttpError(404, 'not_found', 'Account not found.');
  const plan = await buildPlan(ctx.env, user);
  return jsonResponse({ balanceMinor, plan, user }, ctx.request, ctx.config);
}

export async function pendingIncomes(ctx: RequestContext): Promise<Response> {
  const today = localDateISO(nowISO(), ctx.user.timezone);
  const from = addDays(today, -3);
  const to = addDays(today, 3);

  const events = salaryEvents(ctx.user.finance.incomes, addDays(today, -4), 12).filter(
    (event) => event.date >= from && event.date <= to,
  );

  const { results } = await ctx.env.DB.prepare(
    'SELECT source_id, payday_date, status FROM income_confirmations WHERE uid = ? AND payday_date >= ?',
  )
    .bind(ctx.auth.uid, from)
    .all<{ source_id: string; payday_date: string; status: string }>();

  const handled = new Set((results ?? []).map((row) => `${row.source_id}|${row.payday_date}`));
  const pending = events.filter((event) => !handled.has(`${event.sourceId}|${event.date}`));

  return jsonResponse({ pending, today }, ctx.request, ctx.config);
}

export async function confirmIncome(ctx: RequestContext): Promise<Response> {
  const input = await ctx.parseBody(confirmIncomeSchema);
  const id = randomId('inc');
  const ts = nowISO();

  await ctx.env.DB.prepare(
    `INSERT INTO income_confirmations (id, uid, source_id, payday_date, amount_minor, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(uid, source_id, payday_date) DO UPDATE SET status = excluded.status, amount_minor = excluded.amount_minor`,
  )
    .bind(id, ctx.auth.uid, input.sourceId, input.paydayDate, input.amountMinor, input.status, ts)
    .run();

  if (input.status === 'confirmed') {
    const occurredAt = `${input.paydayDate}T12:00:00.000Z`;
    const duplicate = await ctx.env.DB.prepare(
      `SELECT id FROM transactions WHERE uid = ? AND kind = 'income' AND amount_minor = ? AND substr(occurred_at, 1, 10) = ?`,
    )
      .bind(ctx.auth.uid, input.amountMinor, input.paydayDate)
      .first<{ id: string }>();

    if (!duplicate) {
      await ctx.env.DB.prepare(
        `INSERT INTO transactions (id, uid, kind, amount_minor, label, category, occurred_at, source, hash, created_at)
         VALUES (?, ?, 'income', ?, 'Salary', 'other', ?, 'income', NULL, ?)`,
      )
        .bind(randomId('tx'), ctx.auth.uid, input.amountMinor, occurredAt, ts)
        .run();
      await applyBalanceDelta(ctx, input.amountMinor);
    }
  }

  const fresh = (await getUser(ctx.env.DB, ctx.auth.uid)) ?? ctx.user;
  const plan = await buildPlan(ctx.env, fresh);
  return jsonResponse({ ok: true, plan, balanceMinor: fresh.balanceMinor }, ctx.request, ctx.config);
}


