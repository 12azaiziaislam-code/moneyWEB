/**
 * One finance API for both roles.
 *  - user  → /api/finance (D1, server-computed plan)
 *  - guest → local IndexedDB document + the same pure plan maths on device
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FinanceProfile, HealthProfile, PlanResult, Transaction, WebUser } from '../../shared/types';
import { majorToMinor } from '../../shared/money';
import { apiFetch } from '../lib/api';
import { guestPlan, type GuestData } from '../lib/guestStore';
import { useAuth } from '../state/AuthContext';

export interface PendingIncome {
  date: string;
  label: string;
  amountMinor: number;
  sourceId: string;
}

export interface TxInput {
  kind: 'expense' | 'income';
  amountMinor: number;
  label: string;
  category: string;
  occurredAt: string;
  hash?: string | null;
}

export interface FinanceController {
  isGuest: boolean;
  loading: boolean;
  error: string | null;
  plan: PlanResult | null;
  transactions: Transaction[];
  pending: PendingIncome[];
  currency: string;
  timezone: string;
  finance: FinanceProfile;
  health: HealthProfile;
  refresh: () => Promise<void>;
  setBalance: (minor: number) => Promise<void>;
  saveFinance: (finance: FinanceProfile) => Promise<void>;
  saveHealth: (health: HealthProfile) => Promise<void>;
  addTransaction: (tx: TxInput) => Promise<void>;
  addTransactions: (items: TxInput[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  confirmIncome: (item: PendingIncome, confirmed: boolean) => Promise<void>;
  setLevel: (level: FinanceProfile['level']) => Promise<void>;
}

const sortTx = (list: Transaction[]) =>
  [...list].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0));

export function useFinance(): FinanceController {
  const { role, user, guestData, setGuestData } = useAuth();
  const isGuest = role === 'guest';
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pending, setPending] = useState<PendingIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch<{ user: WebUser; plan: PlanResult; transactions: Transaction[] }>('/api/finance');
      setPlan(response.plan);
      setTransactions(response.transactions);
      setError(null);
      try {
        const pendingResponse = await apiFetch<{ pending: PendingIncome[] }>('/api/income/pending');
        setPending(pendingResponse.pending);
      } catch {
        setPending([]);
      }
    } catch {
      setError('network');
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    void load();
  }, [load]);

  const guestView = useMemo(() => {
    if (!isGuest || !guestData) return null;
    return { plan: guestPlan(guestData), transactions: sortTx(guestData.transactions) };
  }, [guestData, isGuest]);

  const mutateGuest = useCallback(
    async (mutator: (data: GuestData) => GuestData) => {
      if (!guestData) return;
      await setGuestData(mutator(guestData));
    },
    [guestData, setGuestData],
  );

  const withDelta = (data: GuestData, delta: number): GuestData => ({
    ...data,
    settings: { ...data.settings, balanceMinor: Math.max(0, data.settings.balanceMinor + delta) },
  });

  const setBalance = useCallback(
    async (minor: number) => {
      if (isGuest) {
        await mutateGuest((data) => ({
          ...data,
          settings: { ...data.settings, balanceMinor: Math.max(0, Math.round(minor)) },
        }));
        return;
      }
      const response = await apiFetch<{ plan: PlanResult }>('/api/balance', {
        method: 'POST',
        body: { balanceMinor: minor },
      });
      setPlan(response.plan);
      await load();
    },
    [isGuest, load, mutateGuest],
  );

  const saveFinance = useCallback(
    async (finance: FinanceProfile) => {
      if (isGuest) {
        await mutateGuest((data) => ({
          ...data,
          settings: { ...data.settings, finance, currency: finance.currency },
        }));
        return;
      }
      const response = await apiFetch<{ user: WebUser; plan: PlanResult }>('/api/finance', {
        method: 'PUT',
        body: finance,
      });
      setPlan(response.plan);
    },
    [isGuest, mutateGuest],
  );

  const saveHealth = useCallback(
    async (health: HealthProfile) => {
      if (isGuest) {
        await mutateGuest((data) => ({ ...data, settings: { ...data.settings, health } }));
        return;
      }
      await apiFetch<{ user: WebUser }>('/api/me', { method: 'PATCH', body: { health } });
    },
    [isGuest, mutateGuest],
  );

  const addTransaction = useCallback(
    async (tx: TxInput) => {
      if (isGuest) {
        await mutateGuest((data) => {
          const delta = tx.kind === 'expense' ? -tx.amountMinor : tx.amountMinor;
          const withBalance = withDelta(data, delta);
          return {
            ...withBalance,
            transactions: [
              { ...tx, id: `local-${Date.now()}`, source: 'manual' as const, hash: tx.hash ?? null },
              ...withBalance.transactions,
            ],
          };
        });
        return;
      }
      const response = await apiFetch<{ transaction: Transaction; plan: PlanResult }>('/api/transactions', {
        method: 'POST',
        body: tx,
      });
      setTransactions((current) => [response.transaction, ...current]);
      setPlan(response.plan);
    },
    [isGuest, mutateGuest],
  );

  const addTransactions = useCallback(
    async (items: TxInput[]) => {
      if (!items.length) return;
      if (isGuest) {
        await mutateGuest((data) => {
          const delta = items.reduce((sum, tx) => sum + (tx.kind === 'expense' ? -tx.amountMinor : tx.amountMinor), 0);
          const withBalance = withDelta(data, delta);
          return {
            ...withBalance,
            transactions: [
              ...items.map((tx, index) => ({
                ...tx,
                id: `local-${Date.now()}-${index}`,
                source: 'scan' as const,
                hash: tx.hash ?? null,
              })),
              ...withBalance.transactions,
            ],
          };
        });
        return;
      }
      const response = await apiFetch<{ transactions: Transaction[]; plan: PlanResult }>('/api/transactions/bulk', {
        method: 'POST',
        body: { items },
      });
      setTransactions((current) => [...response.transactions, ...current]);
      setPlan(response.plan);
    },
    [isGuest, mutateGuest],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (isGuest) {
        await mutateGuest((data) => {
          const target = data.transactions.find((tx) => tx.id === id);
          const revert = target ? (target.kind === 'expense' ? target.amountMinor : -target.amountMinor) : 0;
          const withBalance = withDelta(data, revert);
          return { ...withBalance, transactions: withBalance.transactions.filter((tx) => tx.id !== id) };
        });
        return;
      }
      const response = await apiFetch<{ plan: PlanResult }>(`/api/transactions/${id}`, { method: 'DELETE' });
      setTransactions((current) => current.filter((tx) => tx.id !== id));
      setPlan(response.plan);
    },
    [isGuest, mutateGuest],
  );

  const confirmIncome = useCallback(
    async (item: PendingIncome, confirmed: boolean) => {
      if (isGuest) return;
      const response = await apiFetch<{ plan: PlanResult }>('/api/income/confirm', {
        method: 'POST',
        body: {
          sourceId: item.sourceId,
          paydayDate: item.date,
          amountMinor: item.amountMinor,
          status: confirmed ? 'confirmed' : 'skipped',
        },
      });
      setPlan(response.plan);
      setPending((current) => current.filter((entry) => entry !== item));
      await load();
    },
    [isGuest, load],
  );

  const setLevel = useCallback(
    async (level: FinanceProfile['level']) => {
      const finance = (isGuest ? guestData?.settings.finance : user?.finance) ?? null;
      if (!finance) return;
      await saveFinance({ ...finance, level });
    },
    [guestData?.settings.finance, isGuest, saveFinance, user?.finance],
  );

  const currency = (isGuest ? guestData?.settings.currency : user?.currency) ?? 'RUB';
  const timezone = (isGuest ? guestData?.settings.timezone : user?.timezone) ?? 'Europe/Moscow';

  return {
    isGuest,
    loading: isGuest ? false : loading,
    error: isGuest ? null : error,
    plan: isGuest ? (guestView?.plan ?? null) : plan,
    transactions: isGuest ? (guestView?.transactions ?? []) : transactions,
    pending: isGuest ? [] : pending,
    currency,
    timezone,
    finance:
      (isGuest ? guestData?.settings.finance : user?.finance) ?? {
        currency,
        incomes: [],
        fixedExpenses: [],
        savingsRates: { hard: 30, normal: 15, easy: 5 },
        level: 'normal',
      },
    health:
      (isGuest ? guestData?.settings.health : user?.health) ?? { conditions: [], medications: [], allergies: [] },
    refresh: load,
    setBalance,
    saveFinance,
    saveHealth,
    addTransaction,
    addTransactions,
    deleteTransaction,
    confirmIncome,
    setLevel,
  };
}

/** Parses a money field into minor units (helper for the forms). */
export function parseAmount(value: string, currency: string): number | null {
  const parsed = majorToMinor(value, currency);
  return parsed !== null && parsed >= 0 ? parsed : null;
}
