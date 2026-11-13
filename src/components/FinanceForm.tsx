/**
 * Baraka v2 — Smart Accounting & Financial Management Suite
 * Professional Financial Command Center:
 * - Real-time accounting cockpit (Income, Fixed Obligations, Savings Allocation, Daily Safe Spend)
 * - Intelligent spending styles (Disciplined 30%, Balanced 15%, Flexible 5%)
 * - Categorized fixed obligations with due-day tracking
 * - Live instant calculations without server roundtrip latency
 * - Sticky bottom actions with defensive auto-save on close
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  Laptop,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { FinanceProfile, IncomeSource, SpendLevel } from '../../shared/types';
import { formatMoney, majorToMinor, minorToDecimalString } from '../../shared/money';
import { FIXED_EXPENSE_PRESETS } from '../../shared/constants';
import { useFinance } from '../data/finance';
import { useToast } from '../state/ToastContext';
import { Button, IconButton } from './ui/Button';
import { Input, Select } from './ui/Field';
import { Badge } from './ui/Feedback';
import { cn } from './ui';

const CADENCES: IncomeSource['cadence'][] = ['monthly', 'semimonthly', 'biweekly', 'weekly', 'quarterly'];
const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export function FinanceForm({ initial, onSaved }: { initial: FinanceProfile; onSaved?: () => void }) {
  const { t, i18n } = useTranslation();
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
  const [showCustomRates, setShowCustomRates] = useState(false);

  const financeRef = useRef(finance);
  financeRef.current = finance;
  const initialRef = useRef(initial);
  const savedRef = useRef(false);

  // Draft string helper for non-blocking decimal editing
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

  const addIncomePreset = (label: string) => {
    setFinance((current) => ({
      ...current,
      incomes: [
        ...current.incomes,
        {
          id: newId('inc'),
          label,
          amountMinor: 0,
          cadence: 'monthly',
          lastPayday: new Date().toISOString().slice(0, 10),
          active: true,
        },
      ],
    }));
  };

  const addExpensePreset = (key: string, dueDay: number) => {
    const label = t(`fixed.${key}`);
    // Check if already exists
    if (finance.fixedExpenses.some((e) => e.label === label)) {
      show(`"${label}" مضاف مسبقاً في القائمة`, 'info');
      return;
    }
    setFinance((current) => ({
      ...current,
      fixedExpenses: [
        ...current.fixedExpenses,
        {
          id: newId('fix'),
          label,
          amountMinor: 0,
          dueDay,
          active: true,
        },
      ],
    }));
  };

  // =========================================================================
  // LIVE ACCOUNTING ENGINE (Calculated instantaneously in browser memory)
  // =========================================================================
  const monthlyIncomeMinor = useMemo(() => {
    return finance.incomes
      .filter((inc) => inc.active !== false)
      .reduce((sum, inc) => {
        const amt = inc.amountMinor || 0;
        switch (inc.cadence) {
          case 'weekly':
            return sum + Math.round((amt * 52) / 12);
          case 'biweekly':
            return sum + Math.round((amt * 26) / 12);
          case 'semimonthly':
            return sum + amt * 2;
          case 'quarterly':
            return sum + Math.round(amt / 3);
          case 'monthly':
          default:
            return sum + amt;
        }
      }, 0);
  }, [finance.incomes]);

  const totalFixedMinor = useMemo(() => {
    return finance.fixedExpenses
      .filter((exp) => exp.active !== false)
      .reduce((sum, exp) => sum + (exp.amountMinor || 0), 0);
  }, [finance.fixedExpenses]);

  const currentLevel = finance.level ?? 'normal';
  const savingsPct = finance.savingsRates?.[currentLevel] ?? (currentLevel === 'hard' ? 30 : currentLevel === 'normal' ? 15 : 5);
  const monthlySavingsMinor = Math.round((monthlyIncomeMinor * savingsPct) / 100);
  const netSpendableMinor = Math.max(0, monthlyIncomeMinor - totalFixedMinor - monthlySavingsMinor);
  const dailySafeLimitMinor = Math.round(netSpendableMinor / 30);

  const fixedRatio = monthlyIncomeMinor > 0 ? Math.round((totalFixedMinor / monthlyIncomeMinor) * 100) : 0;
  const savingsRatio = monthlyIncomeMinor > 0 ? Math.round((monthlySavingsMinor / monthlyIncomeMinor) * 100) : 0;
  const spendableRatio = Math.max(0, 100 - fixedRatio - savingsRatio);

  const submit = async () => {
    setSaving(true);
    try {
      await saveFinance({ ...finance, currency, updatedAt: new Date().toISOString() });
      savedRef.current = true;
      show('تم حفظ الخطة المالية وتحديث الميزانية بنجاح', 'success');
      onSaved?.();
    } catch {
      show(t('common2.saveFailed'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  // Defensive auto-save on unmount if modified and not explicitly saved
  useEffect(() => {
    return () => {
      if (savedRef.current) return;
      const current = financeRef.current;
      const init = initialRef.current;
      if (JSON.stringify(current) !== JSON.stringify(init)) {
        void saveFinance({ ...current, currency, updatedAt: new Date().toISOString() });
      }
    };
  }, [currency, saveFinance]);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {/* ===================================================================
          1. LIVE ACCOUNTING COCKPIT (Real-time financial intelligence)
          =================================================================== */}
      <div className="rounded-2xl border border-line bg-surface2/60 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-line/50 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="font-display text-sm font-bold text-fg">
              التقرير المالي التقديري (مؤشرات لحظية)
            </h3>
          </div>
          {monthlyIncomeMinor === 0 ? (
            <Badge tone="neutral">سجّل دخلك للحساب</Badge>
          ) : totalFixedMinor > monthlyIncomeMinor ? (
            <Badge tone="danger">تنبيه: عجز مالي</Badge>
          ) : fixedRatio > 55 ? (
            <Badge tone="warn">التزامات مرتفعة ({fixedRatio}%)</Badge>
          ) : (
            <Badge tone="ok">ميزانية متزنة ورشيدة</Badge>
          )}
        </div>

        {/* 3 Major Accounting Pillars */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-xl border border-line/60 bg-surface p-2.5">
            <span className="block text-[11px] font-semibold text-muted">إجمالي الدخل</span>
            <span className="font-display text-sm sm:text-base font-bold text-fg">
              {formatMoney(monthlyIncomeMinor, currency, i18n.language)}
            </span>
            <span className="block text-[10px] text-muted-soft">شهرياً</span>
          </div>

          <div className="rounded-xl border border-line/60 bg-surface p-2.5">
            <span className="block text-[11px] font-semibold text-muted">المصاريف الثابتة</span>
            <span className="font-display text-sm sm:text-base font-bold text-danger">
              {formatMoney(totalFixedMinor, currency, i18n.language)}
            </span>
            <span className="block text-[10px] text-muted-soft">
              {monthlyIncomeMinor > 0 ? `${fixedRatio}% من الدخل` : '—'}
            </span>
          </div>

          <div className="rounded-xl border border-line/60 bg-surface p-2.5">
            <span className="block text-[11px] font-semibold text-muted">مخصص الادخار</span>
            <span className="font-display text-sm sm:text-base font-bold text-accent">
              {formatMoney(monthlySavingsMinor, currency, i18n.language)}
            </span>
            <span className="block text-[10px] text-muted-soft">{savingsPct}% مستقطع</span>
          </div>
        </div>

        {/* Proportional Budget Distribution Visualizer */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] font-medium text-muted">
            <span>توزيع الميزانية</span>
            <span className="font-bold text-fg">
              سقف الصرف الآمن:{' '}
              <strong className="text-accent text-xs">
                {formatMoney(dailySafeLimitMinor, currency, i18n.language)} / يوم
              </strong>
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface">
            <div
              style={{ width: `${Math.min(100, fixedRatio)}%` }}
              className="bg-danger/80 transition-all duration-300"
              title={`مصاريف ثابتة: ${fixedRatio}%`}
            />
            <div
              style={{ width: `${Math.min(100 - fixedRatio, savingsRatio)}%` }}
              className="bg-accent transition-all duration-300"
              title={`ادخار: ${savingsRatio}%`}
            />
            <div
              style={{ width: `${Math.max(0, spendableRatio)}%` }}
              className="bg-ok/70 transition-all duration-300"
              title={`متاح للصرف اليومي: ${spendableRatio}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-soft pt-0.5">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" /> ثابتة ({fixedRatio}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> ادخار ({savingsRatio}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> حر ({spendableRatio}%)
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================
          2. FINANCIAL MANAGEMENT STYLE (Clear, dignified, professional modes)
          =================================================================== */}
      <div className="space-y-2.5">
        <div>
          <h4 className="font-display text-sm font-bold text-fg">نمط الإدارة والادخار المالي</h4>
          <p className="text-xs text-muted">اختر النمط المناسب لظروفك الحالية لتحقيق التوازن المالي</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Mode 1: Strict / High Savings */}
          <button
            type="button"
            onClick={() => setFinance((current) => ({ ...current, level: 'hard' }))}
            className={cn(
              'flex flex-col items-start p-3 rounded-xl border text-start transition-all cursor-pointer',
              currentLevel === 'hard'
                ? 'border-accent bg-accent-soft/40 shadow-sm ring-1 ring-accent'
                : 'border-line bg-surface hover:bg-surface2/60',
            )}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span className="font-display text-xs font-bold text-fg">ادخار مكثف</span>
              </div>
              <Badge tone={currentLevel === 'hard' ? 'accent' : 'neutral'}>
                {finance.savingsRates.hard}%
              </Badge>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              لسداد الالتزامات وبناء صندوق الطوارئ بأسرع وتيرة ممكنة.
            </p>
          </button>

          {/* Mode 2: Balanced (Recommended) */}
          <button
            type="button"
            onClick={() => setFinance((current) => ({ ...current, level: 'normal' }))}
            className={cn(
              'flex flex-col items-start p-3 rounded-xl border text-start transition-all cursor-pointer relative',
              currentLevel === 'normal'
                ? 'border-accent bg-accent-soft/40 shadow-sm ring-1 ring-accent'
                : 'border-line bg-surface hover:bg-surface2/60',
            )}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-accent" />
                <span className="font-display text-xs font-bold text-fg">متوازن</span>
              </div>
              <Badge tone={currentLevel === 'normal' ? 'ok' : 'neutral'}>
                {finance.savingsRates.normal}%
              </Badge>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              الخيار الموصى به: يوازن بين العيش الكريم وبناء مدخرات المستقبل.
            </p>
          </button>

          {/* Mode 3: Flexible */}
          <button
            type="button"
            onClick={() => setFinance((current) => ({ ...current, level: 'easy' }))}
            className={cn(
              'flex flex-col items-start p-3 rounded-xl border text-start transition-all cursor-pointer',
              currentLevel === 'easy'
                ? 'border-accent bg-accent-soft/40 shadow-sm ring-1 ring-accent'
                : 'border-line bg-surface hover:bg-surface2/60',
            )}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="font-display text-xs font-bold text-fg">مرن</span>
              </div>
              <Badge tone={currentLevel === 'easy' ? 'accent' : 'neutral'}>
                {finance.savingsRates.easy}%
              </Badge>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              أولوية للسيولة الآنية مع استقطاع رمزي مستمر للطوارئ.
            </p>
          </button>
        </div>

        {/* Custom Rates Collapsible Accordion */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowCustomRates(!showCustomRates)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-fg font-semibold cursor-pointer transition-colors"
          >
            {showCustomRates ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span>تخصيص نسب الادخار يدوياً (%)</span>
          </button>

          {showCustomRates ? (
            <div className="grid grid-cols-3 gap-2.5 pt-2.5 animate-in fade-in duration-fast">
              {(['hard', 'normal', 'easy'] as SpendLevel[]).map((level) => (
                <Input
                  key={level}
                  label={level === 'hard' ? 'مكثف (%)' : level === 'normal' ? 'متوازن (%)' : 'مرن (%)'}
                  type="number"
                  inputMode="numeric"
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
          ) : null}
        </div>
      </div>

      {/* ===================================================================
          3. INCOME SOURCES MANAGEMENT
          =================================================================== */}
      <div className="space-y-3 pt-2 border-t border-line/60">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="font-display text-sm font-bold text-fg">مصادر الدخل الشهري</h4>
            <p className="text-xs text-muted">سجّل رواتبك وأي مصادر دخل دورية لضبط سقف الصرف</p>
          </div>
          <Badge tone="accent">
            {formatMoney(monthlyIncomeMinor, currency, i18n.language)}
          </Badge>
        </div>

        {/* Quick Add Presets */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => addIncomePreset('راتب وظيفي')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface2 text-xs font-semibold text-fg cursor-pointer transition-colors"
          >
            <Briefcase className="h-3.5 w-3.5 text-accent" />
            <span>+ راتب وظيفي</span>
          </button>
          <button
            type="button"
            onClick={() => addIncomePreset('عمل حر')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface2 text-xs font-semibold text-fg cursor-pointer transition-colors"
          >
            <Laptop className="h-3.5 w-3.5 text-accent" />
            <span>+ عمل حر</span>
          </button>
          <button
            type="button"
            onClick={() => addIncomePreset('عائد تجاري / استثمار')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface2 text-xs font-semibold text-fg cursor-pointer transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5 text-accent" />
            <span>+ استثمار / تجارة</span>
          </button>
        </div>

        {/* Empty State */}
        {finance.incomes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface/40 p-4 text-center space-y-1">
            <Wallet className="h-6 w-6 text-muted mx-auto" />
            <p className="text-xs font-bold text-fg">لم تسجّل أي مصدر دخل بعد</p>
            <p className="text-[11px] text-muted">انقر على "+ راتب وظيفي" أعلاه لإضافة راتبك الشهري</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {finance.incomes.map((income) => (
              <div
                key={income.id}
                className="rounded-xl border border-line bg-surface p-3.5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Briefcase className="h-4 w-4 text-accent shrink-0" />
                    <Input
                      label="اسم مصدر الدخل"
                      value={income.label}
                      maxLength={60}
                      placeholder="مثال: راتب الشركة الأساسي"
                      onChange={(event) => patchIncome(income.id, { label: event.target.value })}
                      className="text-xs font-bold"
                    />
                  </div>
                  <IconButton
                    label="حذف مصدر الدخل"
                    onClick={() =>
                      setFinance((current) => ({
                        ...current,
                        incomes: current.incomes.filter((item) => item.id !== income.id),
                      }))
                    }
                    className="text-muted hover:text-danger hover:bg-dangerSoft shrink-0"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </IconButton>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    label={`المبلغ (${currency})`}
                    inputMode="decimal"
                    value={amountFor(income.id, income.amountMinor)}
                    placeholder="0.00"
                    onChange={(event) =>
                      setAmount(income.id, event.target.value, (minor) =>
                        patchIncome(income.id, { amountMinor: minor }),
                      )
                    }
                  />

                  <Select
                    label="دورية القبض"
                    value={income.cadence}
                    onChange={(event) =>
                      patchIncome(income.id, { cadence: event.target.value as IncomeSource['cadence'] })
                    }
                  >
                    {CADENCES.map((cadence) => (
                      <option key={cadence} value={cadence}>
                        {t(`accountant.cadence.${cadence}`)}
                      </option>
                    ))}
                  </Select>

                  <Input
                    label="تاريخ الراتب القادم"
                    type="date"
                    value={income.lastPayday}
                    onChange={(event) => patchIncome(income.id, { lastPayday: event.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===================================================================
          4. FIXED OBLIGATIONS & EXPENSES
          =================================================================== */}
      <div className="space-y-3 pt-2 border-t border-line/60">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="font-display text-sm font-bold text-fg">المصاريف والالتزامات الثابتة</h4>
            <p className="text-xs text-muted">الإيجار، الفواتير، الأقساط الشهرية التي تخصم قبل الراتب</p>
          </div>
          <Badge tone={totalFixedMinor > 0 ? 'warn' : 'neutral'}>
            {formatMoney(totalFixedMinor, currency, i18n.language)}
          </Badge>
        </div>

        {/* Categorized Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-muted block">إضافة سريعة لبنود شائعة:</span>
          <div className="flex flex-wrap gap-1.5">
            {FIXED_EXPENSE_PRESETS.map(({ key, dueDay }) => (
              <button
                key={key}
                type="button"
                onClick={() => addExpensePreset(key, dueDay)}
                className="px-2 py-1 rounded-lg border border-line bg-surface hover:bg-surface2 text-[11px] font-semibold text-fg cursor-pointer transition-colors"
              >
                + {t(`fixed.${key}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Expense List */}
        {finance.fixedExpenses.length > 0 ? (
          <div className="space-y-2">
            {finance.fixedExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2.5 shadow-xs"
              >
                <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <Input
                      label="البند"
                      value={expense.label}
                      maxLength={60}
                      onChange={(event) => patchFixed(expense.id, { label: event.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      label={`المبلغ (${currency})`}
                      inputMode="decimal"
                      value={amountFor(expense.id, expense.amountMinor)}
                      placeholder="0.00"
                      onChange={(event) =>
                        setAmount(expense.id, event.target.value, (minor) =>
                          patchFixed(expense.id, { amountMinor: minor }),
                        )
                      }
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      label="يوم الاستحقاق"
                      type="number"
                      min={1}
                      max={31}
                      value={expense.dueDay}
                      onChange={(event) =>
                        patchFixed(expense.id, { dueDay: Number(event.target.value) || 1 })
                      }
                    />
                  </div>
                </div>

                <IconButton
                  label="حذف المصروف"
                  onClick={() =>
                    setFinance((current) => ({
                      ...current,
                      fixedExpenses: current.fixedExpenses.filter((item) => item.id !== expense.id),
                    }))
                  }
                  className="text-muted hover:text-danger hover:bg-dangerSoft shrink-0"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </IconButton>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* ===================================================================
          5. PERMANENT STICKY BOTTOM ACTION BAR WITH LIVE STATS
          =================================================================== */}
      <div className="sticky bottom-0 -mx-5 -mb-4 mt-6 border-t border-line bg-surface/95 backdrop-blur-md px-5 py-3.5 shadow-e2 z-20 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold text-muted block">سقف الصرف المحسوب</span>
          <span className="font-display text-sm font-bold text-accent truncate block">
            {formatMoney(dailySafeLimitMinor, currency, i18n.language)} / يوم
          </span>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={saving}
          icon={<Check className="h-4 w-4" />}
          className="shrink-0 px-6 font-bold"
        >
          حفظ وضبط الخطة المالية
        </Button>
      </div>
    </form>
  );
}
