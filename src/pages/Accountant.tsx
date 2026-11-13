/** Accountant dashboard + sheets (balance, manual entry, receipt review, AI drawer). */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, MessageCircle, Plus, Trash2 } from 'lucide-react';
import type { ExtractedTransaction } from '../../shared/types';
import { formatMoney, majorToMinor } from '../../shared/money';
import { localDateISO } from '../../shared/payday';
import { PageHeader } from '../components/AppShell';
import { AccountantChar, type AccountantMood } from '../components/characters/AccountantChar';
import { ChatView } from '../components/ChatView';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, Disclaimer, EmptyState, Skeleton } from '../components/ui/Feedback';
import { Input } from '../components/ui/Field';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Sheet } from '../components/ui/Sheet';
import { SectionHeader, cn } from '../components/ui';
import { ApiError, apiFetch } from '../lib/api';
import { countUp } from '../lib/motion';
import { formatCalendarDate, fromDateTimeLocal, toDateTimeLocal } from '../lib/format';
import { prepareImage, type PreparedImage } from '../lib/image';
import { useFinance } from '../data/finance';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { usePageTheme } from '../lib/theme';
import { haptic, HAPTIC } from '../lib/haptics';

const MOOD: Record<string, AccountantMood> = { green: 'happy', yellow: 'calm', orange: 'worried', red: 'panic' };

export function AccountantPage() {
  const { t } = useTranslation();
  const { show } = useToast();
  const { user } = useAuth();
  const { plan, transactions, pending, loading, currency, timezone, isGuest, finance, setLevel, setBalance, addTransaction, addTransactions, deleteTransaction, confirmIncome } = useFinance();
  usePageTheme('accountant');

  const balanceRef = useRef<HTMLSpanElement>(null);
  const receiptRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<'balance' | 'manual' | 'review' | 'chat' | null>(null);
  const [balanceDraft, setBalanceDraft] = useState('');
  const [items, setItems] = useState<ExtractedTransaction[]>([]);
  const [manual, setManual] = useState({ kind: 'expense' as 'expense' | 'income', amount: '', label: '', occurredAt: new Date().toISOString() });
  const locale = user?.locale ?? 'ru';

  useEffect(() => {
    if (plan) countUp(balanceRef.current, plan.balanceMinor, (value) => formatMoney(Math.round(value), currency, locale));
  }, [plan?.balanceMinor, currency, locale]);

  const spentToday = useMemo(() => {
    const today = localDateISO(new Date().toISOString(), timezone);
    return transactions
      .filter((tx) => tx.kind === 'expense' && localDateISO(tx.occurredAt, timezone) === today)
      .reduce((total, tx) => total + tx.amountMinor, 0);
  }, [timezone, transactions]);

  const ratio = plan && plan.dailyBudgetMinor > 0 ? Math.min(100, (spentToday / plan.dailyBudgetMinor) * 100) : 0;
  const ringTone = plan?.danger === 'red' ? 'danger' : plan?.danger === 'orange' ? 'warn' : 'ok';

  const onReceipt = async (file?: File) => {
    if (!file) return;
    setSheet(null);
    try {
      const prepared: PreparedImage = await prepareImage(file);
      const body: Record<string, unknown> = { hash: prepared.hash };
      if (isGuest) {
        body.imageDataUrl = prepared.dataUrl;
        body.guest = { locale, madhhab: user?.madhhab ?? 'none', finance };
      } else {
        const uploaded = await apiFetch<{ id: string }>('/api/uploads', { method: 'POST', body: { dataUrl: prepared.dataUrl, hash: prepared.hash } });
        body.assetId = uploaded.id;
      }
      const response = await apiFetch<{ result: { items: ExtractedTransaction[] } }>('/api/accountant/extract', { method: 'POST', body });
      if (!response.result.items.length) {
        show(t('errors.ai_parse_failed'), 'warning');
        return;
      }
      setItems(
        response.result.items.map((item) => ({
          ...item,
          duplicate: transactions.some(
            (tx) => tx.amountMinor === item.amountMinor && Math.abs(new Date(tx.occurredAt).getTime() - new Date(item.occurredAt).getTime()) < 1800000,
          ),
        })),
      );
      setSheet('review');
    } catch (cause) {
      show(cause instanceof ApiError ? t('errors.ai_unavailable') : t('errors.generic'), 'danger');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-3 pb-4">
      <PageHeader
        title={t('accountant.title')}
        action={
          <IconButton label={t('chef.drawerTitle')} onClick={() => setSheet('chat')}>
            <MessageCircle className="h-5 w-5" aria-hidden />
          </IconButton>
        }
      />

      {loading && !plan ? <Skeleton className="h-40 w-full" /> : null}

      {plan ? (
        <div className={cn('surface-card p-4', plan.danger === 'red' && 'ring-2 ring-risk-red')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{t('accountant.balance')}</p>
              <span ref={balanceRef} className="num text-display block text-[26px] font-extrabold leading-tight">
                {formatMoney(plan.balanceMinor, currency, locale)}
              </span>
              <p className="num mt-0.5 text-[11px] text-muted">
                {t('accountant.cycleEnd', { date: formatCalendarDate(plan.cycleEnd, locale) })} ·{' '}
                {t('accountant.daysLeft', { count: plan.daysLeft })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setBalanceDraft(String(Math.round(plan.balanceMinor / 100)));
                setSheet('balance');
              }}
              className="min-h-[36px] rounded-full bg-surface2 px-3 text-[11px] font-bold text-muted"
            >
              {t('accountant.editBalance')}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <ProgressRing
              value={ratio}
              size={108}
              stroke={10}
              tone={ringTone}
              label={t('chef.ringToday')}
              pulse={plan.danger === 'red'}
            >
              <span className="num text-[14px] font-extrabold">{Math.round(ratio)}%</span>
            </ProgressRing>
            <div className="min-w-0 flex-1 space-y-0.5 text-[11px] text-muted">
              <p>{t('accountant.dailyBudget')}</p>
              <p className="num text-[15px] font-bold text-fg">{formatMoney(plan.dailyBudgetMinor, currency, locale)}</p>
              <p>{t('accountant.spentToday')}</p>
              <p className="num text-[13px] font-semibold text-fg">{formatMoney(spentToday, currency, locale)}</p>
            </div>
            <AccountantChar size={62} mood={MOOD[plan.danger] ?? 'calm'} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge tone={plan.danger === 'red' ? 'danger' : plan.danger === 'orange' ? 'warn' : 'ok'}>
              {t(`accountant.danger.${plan.danger}`)}
            </Badge>
            <Badge tone="neutral">{t(`accountant.level.${plan.level}`)}</Badge>
          </div>

          {plan.danger === 'red' ? (
            <div className="mt-3 space-y-1 rounded-md bg-risk-redSoft p-3 text-risk-red">
              <p className="text-[13px] font-extrabold">{t('accountant.redTitle')}</p>
              <p className="text-[12px]">
                {t('accountant.redBody', {
                  date: formatCalendarDate(plan.projectedRunOutDate ?? plan.cycleEnd, locale),
                  days: plan.daysWithoutMoney || plan.daysLeft,
                })}
              </p>
              <ul className="space-y-0.5 text-[12px]">
                <li>• {t('accountant.step1')}</li>
                <li>• {t('accountant.step2')}</li>
                <li>• {t('accountant.step3')}</li>
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {plan ? (
        <div className="flex gap-2">
          {(['hard', 'normal', 'easy'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => void setLevel(level)}
              aria-pressed={finance.level === level}
              className={cn(
                'flex-1 rounded-lg border p-2 text-center transition-all',
                finance.level === level ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted',
              )}
            >
              <span className="block text-[12px] font-bold">{t(`accountant.level.${level}`)}</span>
              <span className="num block text-[10px]">{finance.savingsRates[level]}%</span>
            </button>
          ))}
        </div>
      ) : null}

      {pending.map((income) => (
        <div key={`${income.sourceId}-${income.date}`} className="surface-card space-y-2 p-3">
          <p className="text-[13px] font-semibold">
            {t('accountant.paydayQuestion', {
              label: income.label,
              amount: formatMoney(income.amountMinor, currency, locale),
            })}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void confirmIncome(income, true)}>
              {t('accountant.paydayYes')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void confirmIncome(income, false)}>
              {t('accountant.paydayNo')}
            </Button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Button fullWidth variant="secondary" icon={<Camera className="h-4 w-4" aria-hidden />} onClick={() => receiptRef.current?.click()}>
          {t('chef.scanCta')}
        </Button>
        <Button fullWidth variant="soft" icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setSheet('manual')}>
          {t('accountant.addManual')}
        </Button>
      </div>

      <div>
        <SectionHeader title={t('accountant.transactions')} />
        {transactions.length === 0 ? (
          <EmptyState title={t('accountant.emptyTransactions')} />
        ) : (
          <ul className="space-y-1.5">
            {transactions.slice(0, 30).map((tx) => (
              <li key={tx.id} className="flex items-center gap-2 rounded-md border border-line bg-surface p-2.5">
                <span className="num w-7 text-center text-[11px] font-bold text-muted">{tx.occurredAt.slice(8, 10)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{tx.label}</p>
                  <p className="text-[10px] text-muted">{t(`categories.${tx.category}`)}</p>
                </div>
                <span className={cn('num whitespace-nowrap text-[13px] font-extrabold', tx.kind === 'income' ? 'text-ok' : 'text-fg')}>
                  {tx.kind === 'income' ? '+' : '−'}
                  {formatMoney(tx.amountMinor, currency, locale)}
                </span>
                <IconButton label={t('common.delete')} onClick={() => void deleteTransaction(tx.id)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Disclaimer>{t('accountant.disclaimer')}</Disclaimer>
      {isGuest ? <p className="text-center text-[10px] text-muted">{t('guest.localOnly')}</p> : null}

      <input
        ref={receiptRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void onReceipt(event.target.files?.[0])}
      />

      <Sheet
        open={sheet === 'balance'}
        title={t('accountant.setBalance')}
        onClose={() => setSheet(null)}
        footer={
          <Button
            fullWidth
            onClick={async () => {
              const minor = majorToMinor(balanceDraft, currency);
              if (minor === null || minor < 0) {
                show(t('errors.validation_failed'), 'danger');
                return;
              }
              await setBalance(minor);
              setSheet(null);
              show(t('common.saved'), 'success');
            }}
          >
            {t('common.save')}
          </Button>
        }
      >
        <Input
          label={t('accountant.balance')}
          inputMode="decimal"
          value={balanceDraft}
          onChange={(event) => setBalanceDraft(event.target.value)}
          suffix={currency}
        />
      </Sheet>

      <Sheet
        open={sheet === 'manual'}
        title={t('accountant.addManual')}
        onClose={() => setSheet(null)}
        footer={
          <Button
            fullWidth
            onClick={async () => {
              const minor = majorToMinor(manual.amount, currency);
              if (minor === null || minor <= 0 || !manual.label.trim()) {
                show(t('errors.validation_failed'), 'danger');
                return;
              }
              await addTransaction({
                kind: manual.kind,
                amountMinor: minor,
                label: manual.label.trim(),
                category: 'other',
                occurredAt: manual.occurredAt,
              });
              setManual({ ...manual, amount: '', label: '' });
              setSheet(null);
              haptic(HAPTIC.success);
            }}
          >
            {t('common.save')}
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <Button variant={manual.kind === 'expense' ? 'primary' : 'secondary'} onClick={() => setManual({ ...manual, kind: 'expense' })}>
            {t('accountant.expense')}
          </Button>
          <Button variant={manual.kind === 'income' ? 'primary' : 'secondary'} onClick={() => setManual({ ...manual, kind: 'income' })}>
            {t('accountant.income')}
          </Button>
        </div>
        <Input
          label={t('accountant.amount')}
          inputMode="decimal"
          value={manual.amount}
          onChange={(event) => setManual({ ...manual, amount: event.target.value })}
          suffix={currency}
        />
        <Input
          label={t('accountant.label')}
          value={manual.label}
          maxLength={80}
          onChange={(event) => setManual({ ...manual, label: event.target.value })}
        />
        <Input
          label={t('accountant.date')}
          type="datetime-local"
          value={toDateTimeLocal(manual.occurredAt, timezone)}
          onChange={(event) => setManual({ ...manual, occurredAt: fromDateTimeLocal(event.target.value, timezone) })}
        />
      </Sheet>

      {items.length ? (
        <Sheet
          open
          title={t('chef.reviewTitle')}
          onClose={() => setItems([])}
          footer={
            <Button
              fullWidth
              onClick={async () => {
                const payload = items
                  .filter((item) => item.amountMinor > 0)
                  .map((item) => ({
                    kind: item.kind,
                    amountMinor: item.amountMinor,
                    label: item.label,
                    category: item.category,
                    occurredAt: item.occurredAt,
                    hash: item.hash ?? null,
                  }));
                if (!payload.length) {
                  show(t('errors.validation_failed'), 'warning');
                  return;
                }
                await addTransactions(payload);
                setItems([]);
                show(t('common.added'), 'success');
              }}
            >
              {t('accountant.saveAll')}
            </Button>
          }
        >
          {items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="space-y-2 rounded-md bg-surface2 p-2">
              <div className="flex items-center justify-between">
                <Badge tone={item.duplicate ? 'warn' : 'neutral'}>
                  {item.duplicate ? t('accountant.duplicate') : t(`categories.${item.category}`)}
                </Badge>
                <IconButton label={t('common.delete')} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>
                  ✕
                </IconButton>
              </div>
              <Input
                label={t('accountant.label')}
                value={item.label}
                onChange={(event) =>
                  setItems((current) => current.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)))
                }
              />
              <Input
                label={t('accountant.amount')}
                inputMode="decimal"
                value={(item.amountMinor / 100).toFixed(2)}
                onChange={(event) => {
                  const minor = majorToMinor(event.target.value, currency);
                  if (minor === null) return;
                  setItems((current) => current.map((row, i) => (i === index ? { ...row, amountMinor: minor } : row)));
                }}
              />
            </div>
          ))}
        </Sheet>
      ) : null}

      {sheet === 'chat' ? (
        <div className="fixed inset-0 z-[70] flex flex-col bg-bg">
          <header className="safe-top flex items-center gap-2 border-b border-line px-3 py-2">
            <AccountantChar size={36} mood="calm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold">{t('chef.drawerTitle')}</p>
              <p className="truncate text-[10px] text-muted">{t('chef.drawerStatus')}</p>
            </div>
            <IconButton label={t('common.close')} onClick={() => setSheet(null)}>
              ✕
            </IconButton>
          </header>
          <div className="mx-auto flex min-h-0 w-full max-w-app flex-1 flex-col px-3">
            <ChatView kind="accountant" chatId={null} disclaimer={<Disclaimer>{t('accountant.disclaimer')}</Disclaimer>} />
          </div>
        </div>
      ) : null}


    </div>
  );
}
