/**
 * Baraka v2 — Personal Budget & Payday Dashboard
 * Balance as Hero, Daily Budget tracking, Spending Mode Selector (Tight/Normal/Comfortable),
 * Grouped transaction ledger, receipt optical extraction, and desktop 2-column grid.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  X,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import type { ExtractedTransaction } from '../../shared/types';
import { formatMoney, majorToMinor } from '../../shared/money';
import { localDateISO } from '../../shared/payday';
import { PageHeader } from '../components/AppShell';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, Disclaimer, EmptyState, Skeleton } from '../components/ui/Feedback';
import { Input } from '../components/ui/Field';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Sheet } from '../components/ui/Sheet';
import { cn } from '../components/ui';
import { ApiError, apiFetch } from '../lib/api';
import { countUp } from '../lib/motion';
import { formatCalendarDate, fromDateTimeLocal, toDateTimeLocal } from '../lib/format';
import { prepareImage, type PreparedImage } from '../lib/image';
import { useFinance } from '../data/finance';
import { useChatMutations } from '../data/chats';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { usePageTheme } from '../lib/theme';
import { haptic, HAPTIC } from '../lib/haptics';

export function AccountantPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { user } = useAuth();
  const { createChat } = useChatMutations();
  const {
    plan,
    transactions,
    pending,
    loading,
    currency,
    timezone,
    isGuest,
    finance,
    setLevel,
    setBalance,
    addTransaction,
    addTransactions,
    deleteTransaction,
    confirmIncome,
  } = useFinance();
  usePageTheme('accountant');

  const balanceRef = useRef<HTMLSpanElement>(null);
  const receiptRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<'balance' | 'manual' | 'review' | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState('');
  const [items, setItems] = useState<ExtractedTransaction[]>([]);
  const [manual, setManual] = useState({
    kind: 'expense' as 'expense' | 'income',
    amount: '',
    label: '',
    category: 'food',
    occurredAt: new Date().toISOString(),
  });
  const locale = (user?.locale ?? i18n.language ?? 'ru') as string;

  useEffect(() => {
    if (plan) {
      countUp(balanceRef.current, plan.balanceMinor, (value) =>
        formatMoney(Math.round(value), currency, locale),
      );
    }
  }, [plan?.balanceMinor, currency, locale]);

  const spentToday = useMemo(() => {
    const today = localDateISO(new Date().toISOString(), timezone);
    return transactions
      .filter((tx) => tx.kind === 'expense' && localDateISO(tx.occurredAt, timezone) === today)
      .reduce((total, tx) => total + tx.amountMinor, 0);
  }, [timezone, transactions]);

  const ratio =
    plan && plan.dailyBudgetMinor > 0
      ? Math.min(100, (spentToday / plan.dailyBudgetMinor) * 100)
      : 0;
  const ringTone = plan?.danger === 'red' ? 'danger' : plan?.danger === 'orange' ? 'warn' : 'ok';

  const onReceipt = async (file?: File) => {
    if (!file) return;
    if (isGuest) {
      show(t('guest.aiRequiresAuth'), 'warning');
      return;
    }
    setSheet(null);
    try {
      const prepared: PreparedImage = await prepareImage(file);
      const body: Record<string, unknown> = { hash: prepared.hash };
      if (isGuest) {
        body.imageDataUrl = prepared.dataUrl;
        body.guest = { locale, madhhab: user?.madhhab ?? 'none', finance };
      } else {
        const uploaded = await apiFetch<{ id: string }>('/api/uploads', {
          method: 'POST',
          body: { dataUrl: prepared.dataUrl, hash: prepared.hash },
        });
        body.assetId = uploaded.id;
      }
      const response = await apiFetch<{ result: { items: ExtractedTransaction[] } }>(
        '/api/accountant/extract',
        { method: 'POST', body },
      );
      if (!response.result.items.length) {
        show(t('errors.ai_parse_failed'), 'warning');
        return;
      }
      setItems(
        response.result.items.map((item) => ({
          ...item,
          duplicate: transactions.some(
            (tx) =>
              tx.amountMinor === item.amountMinor &&
              Math.abs(new Date(tx.occurredAt).getTime() - new Date(item.occurredAt).getTime()) < 1800000,
          ),
        })),
      );
      setSheet('review');
    } catch (cause) {
      show(cause instanceof ApiError ? t('errors.ai_unavailable') : t('errors.generic'), 'danger');
    }
  };

  const modeDescriptions: Record<'hard' | 'normal' | 'easy', { title: string; desc: string }> = {
    hard: {
      title: 'ادخار مكثف (30%)',
      desc: 'استقطاع ادخار مكثف مع تقليص سقف المصروف اليومي لمضاعفة التوفير وحالات الطوارئ.',
    },
    normal: {
      title: 'متوازن (15%)',
      desc: 'التوزيع القياسي الموصى به بين المصروف اليومي وصندوق الأمان.',
    },
    easy: {
      title: 'مرن (5%)',
      desc: 'سعة إنفاق يومية واسعة مع ادخار رمزي مريح.',
    },
  };

  const openAccountantChat = async () => {
    setOpeningChat(true);
    try {
      const balanceStr = plan ? formatMoney(plan.balanceMinor, plan.currency, locale) : '0';
      const dailyStr = plan ? formatMoney(plan.dailyBudgetMinor, plan.currency, locale) : '0';
      const daysLeft = plan?.daysLeft ?? 30;
      const modeTitle = plan ? modeDescriptions[plan.level].title : 'متوازن (15%)';
      const isRu = locale.startsWith('ru');
      const isEn = locale.startsWith('en');

      const seedText = isRu
        ? [
            `💼 **Умный финансовый консультант (Бухгалтер)**`,
            `Здравствуйте! Я ваш финансовый ассистент. Я изучил параметры вашего бюджета:`,
            `• **Текущий баланс:** ${balanceStr}`,
            `• **Дней до зарплаты:** ${daysLeft}`,
            `• **Дневной лимит расходов:** ${dailyStr}`,
            `• **Режим сбережений:** ${modeTitle}`,
            `\nЧем я могу помочь вам сегодня? Выберите готовый вопрос ниже или напишите свой.`,
          ].join('\n\n')
        : isEn
          ? [
              `💼 **Smart Financial Advisor (Accountant)**`,
              `Welcome! I am your personal financial assistant. I have reviewed your budget:`,
              `• **Available Balance:** ${balanceStr}`,
              `• **Days to Payday:** ${daysLeft}`,
              `• **Recommended Daily Spend:** ${dailyStr}`,
              `• **Savings Target:** ${modeTitle}`,
              `\nHow can I help you today? Choose one of the quick suggestions below or type your question.`,
            ].join('\n\n')
          : [
              `💼 **المستشار المالي الذكي (المحاسب)**`,
              `مرحباً بك! أنا مستشارك المالي لمتابعة ميزانيتك وتنظيم مدخراتك بدقة.`,
              `لقد اطلعت على وضعك المالي الحالي:`,
              `• **الرصيد الفعلي في حسابك:** ${balanceStr}`,
              `• **المتبقي حتى الراتب القادم:** ${daysLeft} ${daysLeft === 1 ? 'يوم' : daysLeft === 2 ? 'يومان' : daysLeft <= 10 ? 'أيام' : 'يوماً'}`,
              `• **سقف المصروف اليومي الموصى به:** ${dailyStr}`,
              `• **خطة الادخار المعتمدة:** ${modeTitle}`,
              `\nجاهز لمساعدتك في أي استفسار أو وضع خطة إنفاق متوازنة تناسب رصيدك الحالي. يمكنك الضغط على أحد الأسئلة المقترحة أدناه أو كتابة استفسارك مباشرة.`,
            ].join('\n\n');

      const chatTitle = isRu
        ? `استشارة الميزانية (${balanceStr})`
        : isEn
          ? `Budget Consultation (${balanceStr})`
          : `استشارة الميزانية (${balanceStr})`;

      const chat = await createChat({
        kind: 'accountant',
        title: chatTitle,
        seedText,
      });

      if (chat) {
        navigate(`/chats/${chat.id}`);
      }
    } catch {
      show(t('errors.generic'), 'danger');
    } finally {
      setOpeningChat(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 pb-8">
      <PageHeader
        title={t('accountant.title')}
        action={
          <Button
            size="sm"
            variant="outline"
            loading={openingChat}
            disabled={openingChat}
            icon={<Sparkles className="h-4 w-4 text-accent" />}
            onClick={() => void openAccountantChat()}
          >
            اسأل المحاسب AI
          </Button>
        }
      />

      {loading && !plan ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : null}

      {plan ? (
        <div className="space-y-5 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
          {/* =================================================================
              COLUMN 1 (lg:col-span-5): HERO BALANCE & DAILY BUDGET PROGRESS
              ================================================================= */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1. HERO BALANCE CARD */}
            <div
              className={cn(
                'rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-e2 relative overflow-hidden',
                plan.danger === 'red' && 'ring-2 ring-danger border-danger/50',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">
                    {t('accountant.balance')}
                  </p>
                  <span
                    ref={balanceRef}
                    className="num font-display block text-3xl sm:text-4xl font-extrabold text-fg tracking-tight"
                  >
                    {formatMoney(plan.balanceMinor, currency, locale)}
                  </span>
                  <div className="flex items-center gap-1.5 pt-1 text-xs text-muted font-medium">
                    <Calendar className="h-3.5 w-3.5 text-accent" />
                    <span>
                      موعد الراتب القادم: {formatCalendarDate(plan.cycleEnd, locale)} (باقٍ {plan.daysLeft}{' '}
                      {plan.daysLeft === 1
                        ? 'يوم'
                        : plan.daysLeft === 2
                          ? 'يومان'
                          : plan.daysLeft >= 3 && plan.daysLeft <= 10
                            ? 'أيام'
                            : 'يوماً'}
                      )
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 whitespace-nowrap"
                  onClick={() => {
                    setBalanceDraft(String(Math.round(plan.balanceMinor / 100)));
                    setSheet('balance');
                  }}
                >
                  {t('accountant.editBalance')}
                </Button>
              </div>

              {/* Status Indicator */}
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
                <span className="text-xs text-muted">حالة الميزانية:</span>
                <Badge tone={plan.danger === 'red' ? 'danger' : plan.danger === 'orange' ? 'warn' : 'ok'}>
                  {plan.balanceMinor <= 0
                    ? 'عجز مالي - الرصيد صفر'
                    : plan.danger === 'red' && plan.availableMinor < 0
                      ? 'عجز في سداد الالتزامات'
                      : t(`accountant.danger.${plan.danger}`)}
                </Badge>
              </div>

              {/* Warning Banner */}
              {plan.danger === 'red' ? (
                <div className="mt-3 rounded-xl bg-danger-soft/50 border border-danger/25 p-3 text-xs leading-relaxed text-danger flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-danger" />
                  <div className="text-fg leading-relaxed">
                    <strong className="text-danger font-bold block mb-0.5">
                      {plan.balanceMinor <= 0 ? 'تنبيه: لا يوجد رصيد حالي' : t('accountant.redTitle')}
                    </strong>
                    {plan.balanceMinor <= 0
                      ? 'رصيدك الحالي صفر ولا توجد سيولة للمصروف اليومي حتى موعد الدخل القادم. اضغط على «تعديل الرصيد» لتسجيل رصيدك الفعلي.'
                      : t('accountant.redBody', {
                          date: formatCalendarDate(plan.projectedRunOutDate ?? plan.cycleEnd, locale),
                          days: plan.daysWithoutMoney || plan.daysLeft,
                        })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* 2. TODAY'S DAILY BUDGET TRACKER */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                متابعة الميزانية اليومية
              </p>

              <div className="flex items-center gap-4">
                <ProgressRing
                  value={ratio}
                  size={100}
                  stroke={9}
                  tone={ringTone}
                  label={t('chef.ringToday')}
                  pulse={plan.danger === 'red'}
                >
                  <span className="num text-base font-extrabold">{Math.round(ratio)}%</span>
                </ProgressRing>

                <div className="min-w-0 flex-1 space-y-1">
                  <div>
                    <span className="text-xs text-muted block">{t('accountant.dailyBudget')}</span>
                    <span className="num font-display text-lg font-bold text-fg">
                      {formatMoney(plan.dailyBudgetMinor, currency, locale)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted block">{t('accountant.spentToday')}</span>
                    <span className="num text-sm font-bold text-accent">
                      {formatMoney(spentToday, currency, locale)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. SPENDING & SAVINGS MODE SELECTOR (Explained 30% / 15% / 5%) */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                نمط الإنفاق والادخار
              </p>

              <div className="grid grid-cols-3 gap-2">
                {(['hard', 'normal', 'easy'] as const).map((level) => {
                  const active = finance.level === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => void setLevel(level)}
                      aria-pressed={active}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer',
                        active
                          ? 'border-accent bg-accent text-accent-fg shadow-e1'
                          : 'border-line bg-surface2 text-muted hover:text-fg hover:border-line/80',
                      )}
                    >
                      <span className="text-xs font-bold block truncate">{t(`accountant.level.${level}`)}</span>
                      <span className="num text-sm font-extrabold mt-0.5">{finance.savingsRates[level]}%</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanatory description of currently selected level */}
              <div className="rounded-lg bg-surface2/70 p-3 text-xs text-muted leading-relaxed border border-line/60">
                <span className="font-bold text-fg block mb-0.5">
                  {modeDescriptions[finance.level]?.title}:
                </span>
                {modeDescriptions[finance.level]?.desc}
              </div>
            </div>
          </div>

          {/* =================================================================
              COLUMN 2 (lg:col-span-7): ACTIONS & TRANSACTIONS LEDGER
              ================================================================= */}
          <div className="lg:col-span-7 space-y-4">
            {/* Quick Action Triggers */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                size="md"
                icon={<Camera className="h-4 w-4" />}
                onClick={() => receiptRef.current?.click()}
              >
                {t('chef.scanCta')}
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setSheet('manual')}
              >
                {t('accountant.addManual')}
              </Button>
            </div>

            {/* Pending Incomes confirmation banner */}
            {pending.map((income) => (
              <div
                key={`${income.sourceId}-${income.date}`}
                className="rounded-xl border border-accent/40 bg-accent-soft p-4 space-y-3 shadow-sm"
              >
                <p className="text-sm font-bold text-fg">
                  {t('accountant.paydayQuestion', {
                    label: income.label,
                    amount: formatMoney(income.amountMinor, currency, locale),
                  })}
                </p>
                <div className="flex gap-2.5">
                  <Button size="sm" variant="primary" onClick={() => void confirmIncome(income, true)}>
                    {t('accountant.paydayYes')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void confirmIncome(income, false)}>
                    {t('accountant.paydayNo')}
                  </Button>
                </div>
              </div>
            ))}

            {/* Transactions Ledger Card */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 space-y-3">
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <p className="font-display text-base font-bold text-fg">
                  {t('accountant.transactions')}
                </p>
                <span className="text-xs text-muted font-semibold">
                  {transactions.length === 1
                    ? 'معاملة واحدة'
                    : transactions.length === 2
                      ? 'معاملتان'
                      : transactions.length >= 3 && transactions.length <= 10
                        ? `${transactions.length} عمليات مسجلة`
                        : `${transactions.length} عملية مسجلة`}
                </span>
              </div>

              {transactions.length === 0 ? (
                <EmptyState
                  icon={<CreditCard className="h-10 w-10 text-muted-soft" strokeWidth={1.5} />}
                  title={t('accountant.emptyTransactions')}
                  body="ابدأ بمسح إيصال الشراء بالكاميرا أو أضف معاملة يدوياً من الأزرار أعلاه لتتبع مصاريفك اليومية بدقة."
                />
              ) : (
                <ul className="divide-y divide-line/60 overflow-hidden">
                  {transactions.slice(0, 30).map((tx) => (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface2 text-xs font-bold text-muted border border-line/60">
                          {tx.occurredAt.slice(8, 10)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-fg">{tx.label}</p>
                          <p className="text-[11px] text-muted">{t(`categories.${tx.category}`)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <bdi
                          dir="ltr"
                          className={cn(
                            'num whitespace-nowrap text-sm font-extrabold',
                            tx.kind === 'income' ? 'text-ok' : 'text-fg',
                          )}
                        >
                          {tx.kind === 'income' ? '+' : '−'}
                          {formatMoney(tx.amountMinor, currency, locale)}
                        </bdi>
                        <IconButton
                          label={t('common.delete')}
                          onClick={() => void deleteTransaction(tx.id)}
                          className="text-muted hover:text-danger hover:bg-danger-soft/40 opacity-40 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </IconButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Result-Time High Contrast Visible Disclaimer */}
      <Disclaimer>{t('accountant.disclaimer')}</Disclaimer>

      {/* Hidden File Input for Receipt Scanner */}
      <input
        ref={receiptRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void onReceipt(event.target.files?.[0])}
      />

      {/* =====================================================================
          BOTTOM SHEETS (All Rendered via Portal, safe from overflow trapping)
          ===================================================================== */}
      {/* 1. Edit Balance Modal */}
      <Sheet
        open={sheet === 'balance'}
        title={t('accountant.setBalance')}
        onClose={() => setSheet(null)}
        footer={
          <Button
            fullWidth
            size="lg"
            variant="primary"
            onClick={async () => {
              const minor = majorToMinor(balanceDraft, currency);
              if (minor === null || minor < 0 || minor > 1_000_000_000_00) {
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

      {/* 2. Manual Transaction Sheet */}
      <Sheet
        open={sheet === 'manual'}
        title={t('accountant.addManual')}
        onClose={() => setSheet(null)}
        footer={
          <Button
            fullWidth
            size="lg"
            variant="primary"
            onClick={async () => {
              const minor = majorToMinor(manual.amount, currency);
              if (minor === null || minor <= 0 || minor > 1_000_000_000_00 || !manual.label.trim()) {
                show(t('errors.validation_failed'), 'danger');
                return;
              }
              await addTransaction({
                kind: manual.kind,
                amountMinor: minor,
                label: manual.label.trim(),
                category: manual.kind === 'expense' ? manual.category : 'income',
                occurredAt: manual.occurredAt,
              });
              setManual({ ...manual, amount: '', label: '', category: 'food' });
              setSheet(null);
              haptic(HAPTIC.success);
              show(t('common.added'), 'success');
            }}
          >
            {t('common.save')}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={manual.kind === 'expense' ? 'primary' : 'outline'}
              onClick={() => setManual({ ...manual, kind: 'expense' })}
            >
              {t('accountant.expense')}
            </Button>
            <Button
              variant={manual.kind === 'income' ? 'primary' : 'outline'}
              onClick={() => setManual({ ...manual, kind: 'income' })}
            >
              {t('accountant.income')}
            </Button>
          </div>

          {manual.kind === 'expense' ? (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted">التصنيف:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'food', label: 'طعام' },
                  { id: 'groceries', label: 'بقالة' },
                  { id: 'transport', label: 'مواصلات' },
                  { id: 'utilities', label: 'فواتير وخدمات' },
                  { id: 'health', label: 'صحة' },
                  { id: 'entertainment', label: 'ترفيه' },
                  { id: 'other', label: 'أخرى' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setManual((prev) => ({ ...prev, category: cat.id }))}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer',
                      manual.category === cat.id
                        ? 'bg-accent text-accent-fg border-accent'
                        : 'bg-surface2 text-muted hover:text-fg border-line',
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <Input
            label={t('accountant.amount')}
            inputMode="decimal"
            value={manual.amount}
            onChange={(event) => setManual({ ...manual, amount: event.target.value })}
            suffix={currency}
          />
          <Input
            label={t('accountant.label')}
            placeholder="مثال: مشتريات السوبرماركت، قهوة، بنزين..."
            value={manual.label}
            maxLength={80}
            onChange={(event) => setManual({ ...manual, label: event.target.value })}
          />
          <Input
            label={t('accountant.date')}
            type="datetime-local"
            value={toDateTimeLocal(manual.occurredAt, timezone)}
            onChange={(event) =>
              setManual({ ...manual, occurredAt: fromDateTimeLocal(event.target.value, timezone) })
            }
          />
        </div>
      </Sheet>

      {/* 3. Receipt Extracted Review Sheet */}
      {items.length ? (
        <Sheet
          open
          title={t('chef.reviewTitle')}
          onClose={() => setItems([])}
          footer={
            <Button
              fullWidth
              size="lg"
              variant="primary"
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
            <div key={`${item.label}-${index}`} className="space-y-2 rounded-xl bg-surface2/70 border border-line p-3">
              <div className="flex items-center justify-between">
                <Badge tone={item.duplicate ? 'warn' : 'neutral'}>
                  {item.duplicate ? t('accountant.duplicate') : t(`categories.${item.category}`)}
                </Badge>
                <IconButton
                  label={t('common.delete')}
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <Input
                label={t('accountant.label')}
                value={item.label}
                onChange={(event) =>
                  setItems((current) =>
                    current.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)),
                  )
                }
              />
              <Input
                label={t('accountant.amount')}
                inputMode="decimal"
                value={(item.amountMinor / 100).toFixed(2)}
                onChange={(event) => {
                  const minor = majorToMinor(event.target.value, currency);
                  if (minor === null) return;
                  setItems((current) =>
                    current.map((row, i) => (i === index ? { ...row, amountMinor: minor } : row)),
                  );
                }}
              />
            </div>
          ))}
        </Sheet>
      ) : null}
    </div>
  );
}
