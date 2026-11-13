/** Money profile: spending mode, savings rates, income sources, fixed expenses. */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import type { FinanceProfile, IncomeSource, SpendLevel } from '../../shared/types';
import { majorToMinor, minorToDecimalString } from '../../shared/money';
import { FIXED_EXPENSE_PRESETS } from '../../shared/constants';
import { useFinance } from '../data/finance';
import { useToast } from '../state/ToastContext';
import { Button, IconButton } from './ui/Button';
import { Input, Select } from './ui/Field';
import { Chip, SectionHeader, cn } from './ui';

const LEVELS: SpendLevel[] = ['hard', 'normal', 'easy'];
const CADENCES: IncomeSource['cadence'][] = ['monthly', 'semimonthly', 'biweekly', 'weekly', 'quarterly'];
const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export function FinanceForm({ initial, onSaved }: { initial: FinanceProfile; onSaved?: () => void }) {
  const { t } = useTranslation();
  const { saveFinance } = useFinance();
  const { show } = useToast();
  const currency = initial.currency || 'RUB';

  const [finance, setFinance] = useState<FinanceProfile>({
    ...initial,
    incomes: initial.incomes ?? [],
    fixedExpenses: initial.fixedExpenses ?? [],
    savingsRates: initial.savingsRates ?? { hard: 30, normal: 15, easy: 5 },
    level: initial.level ?? 'normal',
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const amountFor = (id: string, minor: number) => drafts[id] ?? minorToDecimalString(minor, currency);
  const setAmount = (id: string, raw: string, apply: (minor: number) => void) => {
    setDrafts((current) => ({ ...current, [id]: raw }));
    const parsed = majorToMinor(raw, currency);
    if (parsed !== null && parsed >= 0) apply(parsed);
  };

  const patchIncome = (id: string, patch: Partial<IncomeSource>) =>
    setFinance((current) => ({
      ...current,
      incomes: current.incomes.map((income) => (income.id === id ? { ...income, ...patch } : income)),
    }));

  const patchFixed = (id: string, patch: Partial<FinanceProfile['fixedExpenses'][number]>) =>
    setFinance((current) => ({
      ...current,
      fixedExpenses: current.fixedExpenses.map((expense) => (expense.id === id ? { ...expense, ...patch } : expense)),
    }));

  const submit = async () => {
    setSaving(true);
    try {
      await saveFinance({ ...finance, currency, updatedAt: new Date().toISOString() });
      show(t('common.saved'), 'success');
      onSaved?.();
    } catch {
      show(t('common2.saveFailed'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div>
        <SectionHeader title={t('chef.levelHint')} />
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setFinance((current) => ({ ...current, level }))}
              aria-pressed={finance.level === level}
              className={cn(
                'min-h-[60px] rounded-lg border p-2 text-center transition-all',
                finance.level === level
                  ? 'border-transparent bg-accent text-accent-fg shadow-e2'
                  : 'border-line bg-surface text-fg',
              )}
            >
              <span className="block text-[13px] font-bold">{t(`accountant.level.${level}`)}</span>
              <span className="mt-0.5 block text-[10px] opacity-80">{finance.savingsRates[level]}%</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title={t('accountant.savingsTitle')} />
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((level) => (
            <Input
              key={level}
              label={t(`accountant.level.${level}`)}
              type="number"
              min={0}
              max={90}
              value={finance.savingsRates[level]}
              onChange={(event) =>
                setFinance((current) => ({
                  ...current,
                  savingsRates: { ...current.savingsRates, [level]: Number(event.target.value) || 0 },
                }))
              }
            />
          ))}
        </div>
      </div>

      <div>
        <SectionHeader
          title={t('accountant.incomes')}
          action={
            <IconButton
              label={t('accountant.addIncome')}
              onClick={() =>
                setFinance((current) => ({
                  ...current,
                  incomes: [
                    ...current.incomes,
                    {
                      id: newId('inc'),
                      label: t('accountant.incomes'),
                      amountMinor: 0,
                      cadence: 'monthly',
                      lastPayday: new Date().toISOString().slice(0, 10),
                      active: true,
                    },
                  ],
                }))
              }
            >
              <Plus className="h-5 w-5" aria-hidden />
            </IconButton>
          }
        />
        <div className="space-y-2">
          {finance.incomes.map((income) => (
            <div key={income.id} className="space-y-2 rounded-lg border border-line bg-surface p-3">
              <Input
                label={t('accountant.label')}
                value={income.label}
                maxLength={60}
                onChange={(event) => patchIncome(income.id, { label: event.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label={t('accountant.amount')}
                  inputMode="decimal"
                  value={amountFor(income.id, income.amountMinor)}
                  onChange={(event) =>
                    setAmount(income.id, event.target.value, (minor) => patchIncome(income.id, { amountMinor: minor }))
                  }
                />
                <Select
                  label={t('accountant.cadence.monthly')}
                  value={income.cadence}
                  onChange={(event) => patchIncome(income.id, { cadence: event.target.value as IncomeSource['cadence'] })}
                >
                  {CADENCES.map((cadence) => (
                    <option key={cadence} value={cadence}>
                      {t(`accountant.cadence.${cadence}`)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  label={t('accountant.lastPayday')}
                  type="date"
                  value={income.lastPayday}
                  onChange={(event) => patchIncome(income.id, { lastPayday: event.target.value })}
                />
                {income.cadence === 'semimonthly' ? (
                  <>
                    <Input
                      label={t('accountant.day1')}
                      type="number"
                      min={1}
                      max={31}
                      value={income.day1 ?? 10}
                      onChange={(event) => patchIncome(income.id, { day1: Number(event.target.value) })}
                    />
                    <Input
                      label={t('accountant.day2')}
                      type="number"
                      min={1}
                      max={31}
                      value={income.day2 ?? 25}
                      onChange={(event) => patchIncome(income.id, { day2: Number(event.target.value) })}
                    />
                  </>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setFinance((current) => ({
                    ...current,
                    incomes: current.incomes.filter((item) => item.id !== income.id),
                  }))
                }
              >
                {t('common.delete')}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title={t('accountant.fixedExpenses')} />
        <div className="mb-2 flex flex-wrap gap-1.5">
          {FIXED_EXPENSE_PRESETS.map((preset) => (
            <Chip
              key={preset.key}
              onClick={() =>
                setFinance((current) => ({
                  ...current,
                  fixedExpenses: [
                    ...current.fixedExpenses,
                    { id: newId('fix'), label: t(`fixed.${preset.key}`), amountMinor: 0, dueDay: preset.dueDay, active: true },
                  ],
                }))
              }
            >
              + {t(`fixed.${preset.key}`)}
            </Chip>
          ))}
        </div>
        <div className="space-y-2">
          {finance.fixedExpenses.map((expense) => (
            <div key={expense.id} className="flex items-end gap-2 rounded-lg border border-line bg-surface p-2">
              <div className="flex-1 space-y-2">
                <Input
                  label={t('accountant.label')}
                  value={expense.label}
                  maxLength={60}
                  onChange={(event) => patchFixed(expense.id, { label: event.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label={t('accountant.amount')}
                    inputMode="decimal"
                    value={amountFor(expense.id, expense.amountMinor)}
                    onChange={(event) =>
                      setAmount(expense.id, event.target.value, (minor) => patchFixed(expense.id, { amountMinor: minor }))
                    }
                  />
                  <Input
                    label={t('accountant.dueDay')}
                    type="number"
                    min={1}
                    max={31}
                    value={expense.dueDay}
                    onChange={(event) => patchFixed(expense.id, { dueDay: Number(event.target.value) || 1 })}
                  />
                </div>
              </div>
              <IconButton
                label={t('common.delete')}
                onClick={() =>
                  setFinance((current) => ({
                    ...current,
                    fixedExpenses: current.fixedExpenses.filter((item) => item.id !== expense.id),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" fullWidth size="lg" loading={saving}>
        {t('common.save')}
      </Button>
    </form>
  );
}
