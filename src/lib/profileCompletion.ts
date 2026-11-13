/** Single source of truth for "how complete is my profile" — used by Home and Profile. */

import { useMemo } from 'react';
import { useAuth } from '../state/AuthContext';
import { useFinance } from '../data/finance';

export type CompletionStepId = 'body' | 'conditions' | 'currency' | 'income' | 'madhhab';

export interface CompletionStep {
  id: CompletionStepId;
  /** i18n key under `profile3.steps` */
  labelKey: string;
  done: boolean;
  /** Where the user fixes it. */
  target: 'health' | 'money' | 'prefs';
}

export function useProfileCompletion() {
  const { user } = useAuth();
  const { health, finance } = useFinance();

  return useMemo(() => {
    const steps: CompletionStep[] = [
      { id: 'body', labelKey: 'profile3.steps.body', done: Boolean(health.age && health.weightKg), target: 'health' },
      {
        id: 'conditions',
        labelKey: 'profile3.steps.conditions',
        done: Boolean(health.conditions?.length || health.medications?.length || health.allergies?.length),
        target: 'health',
      },
      { id: 'currency', labelKey: 'profile3.steps.currency', done: Boolean(user?.currency || finance.currency), target: 'prefs' },
      { id: 'income', labelKey: 'profile3.steps.income', done: Boolean(finance.incomes?.length), target: 'money' },
      {
        id: 'madhhab',
        labelKey: 'profile3.steps.madhhab',
        done: Boolean(user?.madhhab && user.madhhab !== 'none'),
        target: 'prefs',
      },
    ];
    const done = steps.filter((step) => step.done).length;
    return { steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100) };
  }, [finance.currency, finance.incomes, health, user?.currency, user?.madhhab]);
}
