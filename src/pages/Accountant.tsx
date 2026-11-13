/**
 * Baraka v2 — Personal Budget & Payday Dashboard (المحاسب)
 * Single responsibility: Realistic salary cycle budgeting & daily expense tracking.
 * No investment fatwas or automated bank operating permissions.
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
  CreditCard,
  Sparkles,
  MessagesSquare,
  CheckCircle2,
  TrendingDown,
  ShoppingBag,
  Car,
  Home,
  HeartPulse,
  Receipt,
  Layers,
} from 'lucide-react';
import type { ExtractedTransaction, IncomeSource, SpendLevel } from '../../shared/types';
import { formatMoney, majorToMinor } from '../../shared/money';
import { localDateISO } from '../../shared/payday';
import { PageHeader } from '../components/AppShell';
import { AccountantAvatar } from '../components/characters/Personas';
import { Button, IconButton } from '../components/ui/Button';
import { Disclaimer, StatusBadge, Skeleton, ConfirmDialog } from '../components/ui/Feedback';
import { Input } from '../components/ui/Field';
import { Segmented } from '../components/ui/Controls';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Sheet } from '../components/ui/Sheet';
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

const CATEGORY_ICONS: Record<string, typeof ShoppingBag> = {
  food: ShoppingBag,
  transport: Car,
  housing: Home,
  health: HeartPulse,
  utilities: Receipt,
  general: Layers,
};

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
    saveFinance,
    addTransaction,
    addTransactions,
    deleteTransaction,
    confirmIncome,
  } = useFinance();
  usePageTheme('accountant');

  const balanceRef = useRef<HTMLSpanElement>(null);
  const receiptRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<'setup' | 'balance' | 'manual' | 'review' | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Setup wizard state (3 fields)
  const [setupBalance, setSetupBalance] = useState('');
  const [setupSalaryDay, setSetupSalaryDay] = useState('1');
  const [setupLevel, setSetupLevel] = useState<SpendLevel>('normal');

  const [items, setItems] = useState<ExtractedTransaction[]>([]);
  const [manual, setManual] = useState({
    kind: 'expense' as 'expense' | 'income',
    amount: '',
    label: '',
    category: 'food',
    occurredAt: new Date().toISOString(),
  });

  const locale = (user?.locale ?? i18n.language ?? 'ar') as string;

  // Is budget configured?
  const isConfigured = Boolean(
    plan &&
      (plan.balanceMinor > 0 || (finance.incomes && finance.incomes.length > 0))
  );

  useEffect(() => {
    if (plan && balanceRef.current) {
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

  const remainingToday = plan ? Math.max(0, plan.dailyBudgetMinor - spentToday) : 0;
  const ratio =
    plan && plan.dailyBudgetMinor > 0
      ? Math.min(100, Math.round((spentToday / plan.dailyBudgetMinor) * 100))
      : 0;

  const ringTone =
    plan && plan.balanceMinor <= 0
      ? 'danger'
      : plan?.danger === 'red'
        ? 'danger'
        : plan?.danger === 'orange' || plan?.danger === 'yellow'
          ? 'warn'
          : 'ok';

  // Handle 1-minute quick budget setup
  const handleQuickSetup = async () => {
    const balanceMinor = majorToMinor(setupBalance.trim(), currency) ?? 0;
    const dayNum = Number.parseInt(setupSalaryDay.trim(), 10) || 1;
    if (balanceMinor < 0) {
      show(t('errors.validation_failed'), 'warning');
      return;
    }

    try {
      const todayStr = new Date().toISOString().slice(0, 8);
      const safeDay = Math.max(1, Math.min(28, dayNum));
      const newSalaryIncome: IncomeSource = {
        id: 'inc_salary_' + Date.now(),
        label: 'الراتب الشهري',
        amountMinor: balanceMinor > 0 ? balanceMinor : 100000,
        cadence: 'monthly',
        lastPayday: `${todayStr}${String(safeDay).padStart(2, '0')}`,
        day1: safeDay,
        active: true,
      };

      await saveFinance({
        ...finance,
        incomes: [newSalaryIncome],
        level: setupLevel,
      });

      await setBalance(balanceMinor);
      setSheet(null);
      haptic(HAPTIC.tap);
      show(t('common.saved', 'تم إعداد الميزانية بنجاح'), 'info');
    } catch {
      show(t('errors.generic'), 'danger');
    }
  };

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

  // Consult Accountant in real chat thread
  const openAccountantChat = async () => {
    setOpeningChat(true);
    try {
      const balanceStr = plan ? formatMoney(plan.balanceMinor, plan.currency, locale) : '0';
      const dailyStr = plan ? formatMoney(plan.dailyBudgetMinor, plan.currency, locale) : '0';
      const daysLeft = plan?.daysLeft ?? 30;

      const isRu = locale.startsWith('ru');
      const isEn = locale.startsWith('en');

      const seedText = isRu
        ? `💼 **Бухгалтер**\n• Баланс: ${balanceStr}\n• Дней до зарплаты: ${daysLeft}\n• Дневной бюджет: ${dailyStr}`
        : isEn
          ? `💼 **Accountant**\n• Balance: ${balanceStr}\n• Days to payday: ${daysLeft}\n• Daily budget: ${dailyStr}`
          : `💼 **المحاسب**\n• الرصيد الفعلي: ${balanceStr}\n• الأيام المتبقية حتى الراتب: ${daysLeft} يوماً\n• ميزانية اليوم: ${dailyStr}`;

      const chat = await createChat({
        kind: 'accountant',
        title: t('accountant.title', 'المحاسب'),
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

  const handleManualSubmit = async () => {
    const amountMinor = majorToMinor(manual.amount.trim(), currency);
    if (!amountMinor || amountMinor <= 0) {
      show(t('errors.validation_failed'), 'warning');
      return;
    }
    try {
      await addTransaction({
        kind: manual.kind,
        amountMinor,
        label: manual.label.trim() || t(`accountant.categories.${manual.category}`, manual.category),
        category: manual.category,
        occurredAt: manual.occurredAt,
      });
      setSheet(null);
      setManual({
        kind: 'expense',
        amount: '',
        label: '',
        category: 'food',
        occurredAt: new Date().toISOString(),
      });
      haptic(HAPTIC.tap);
      show(t('common.saved', 'تم تسجيل المعاملة بنجاح'), 'info');
    } catch {
      show(t('errors.generic'), 'danger');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 pb-8">
      {/* 1. Page Header */}
      <PageHeader
        icon={<AccountantAvatar size="lg" />}
        eyebrow={t('money2.eyebrow')}
        title={t('home2.moneyTitle')}
        subtitle={t('money2.subtitle')}
      />

      {loading && !plan ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : null}

      {/* =====================================================================
          STATE 1: UNCONFIGURED (غير مهيّأ)
          ===================================================================== */}
      {!loading && !isConfigured && (
        <div className="hero-surface relative overflow-hidden rounded-2xl border border-line p-6 text-center sm:p-10">
          <div className="relative z-[1] space-y-5">
          <div className="mx-auto flex items-center justify-center">
            <AccountantAvatar size="xl" className="drop-shadow-md" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="font-display text-lg sm:text-xl font-bold text-fg">
              {t('accountant.setupTitle', 'إعداد الميزانية في دقيقة')}
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {t(
                'accountant.unconfiguredNotice',
                'لم تُفعّل ميزانيتك بعد. اضبط رصيدك وموعد راتبك لتحصل على سقف إنفاق يومي دقيق يحميك من نفاد المال قبل نهاية الشهر.'
              )}
            </p>
          </div>

          <div className="pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={() => {
                setSetupBalance('');
                setSetupSalaryDay('1');
                setSetupLevel('normal');
                setSheet('setup');
              }}
              icon={<Sparkles className="h-5 w-5" />}
            >
              {t('accountant.startSetup', 'إعداد الميزانية في دقيقة')}
            </Button>
          </div>

          <ul className="mx-auto grid max-w-2xl grid-cols-1 gap-2.5 pt-3 text-start sm:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="rounded-xl border border-line bg-surface/70 p-3.5">
                <span className="num flex h-6 w-6 items-center justify-center rounded-full bg-tool-money-soft text-xs font-bold text-tool-money">{n}</span>
                <span className="mt-2 block text-sm font-bold text-fg">{t(`money2.f${n}Title`)}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t(`money2.f${n}Body`)}</span>
              </li>
            ))}
          </ul>
          </div>
        </div>
      )}

      {/* =====================================================================
          STATE 2: CONFIGURED DASHBOARD (مهيّأ)
          ===================================================================== */}
      {!loading && isConfigured && plan && (
        <div className="space-y-5 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
          {/* COLUMN 1: Hero Balance, Daily Tracker, Spending Mode */}
          <div className="lg:col-span-6 space-y-4">
            {/* 1. Hero Balance Card */}
            <div className="surface-card p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-semibold text-muted">
                    {t('accountant.balance', 'الرصيد الحالي')}
                  </p>
                  {/* Regular font numbers without monospace */}
                  <span
                    ref={balanceRef}
                    className="font-sans block text-3xl sm:text-4xl font-extrabold text-fg tracking-normal"
                  >
                    {formatMoney(plan.balanceMinor, currency, locale)}
                  </span>
                  <div className="flex items-center gap-1.5 pt-1 text-xs text-muted font-medium">
                    <Calendar className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>
                      موعد الراتب: {formatCalendarDate(plan.cycleEnd, locale)} (باقٍ {plan.daysLeft} يوماً)
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => {
                    setBalanceDraft(String(Math.round(plan.balanceMinor / 100)));
                    setSheet('balance');
                  }}
                >
                  {t('accountant.editBalance', 'تعديل الرصيد')}
                </Button>
              </div>

              {/* Status Indicator */}
              <div className="pt-3 border-t border-line/60 flex items-center justify-between">
                <span className="text-xs text-muted">حالة الميزانية:</span>
                <StatusBadge
                  tone={
                    plan.balanceMinor <= 0 || plan.danger === 'red'
                      ? 'danger'
                      : plan.danger === 'orange' || plan.danger === 'yellow'
                        ? 'warn'
                        : 'ok'
                  }
                  icon={
                    plan.balanceMinor <= 0 || plan.danger === 'red' ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : plan.danger === 'orange' || plan.danger === 'yellow' ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {plan.balanceMinor <= 0
                    ? 'عجز مالي: الرصيد صفر'
                    : plan.danger === 'red'
                      ? t('accountant.statuses.danger', 'خطر: المال لا يكفي')
                      : plan.danger === 'orange' || plan.danger === 'yellow'
                        ? t('accountant.statuses.warning', 'تنبيه: تجاوزت قليلاً')
                        : t('accountant.statuses.safe', 'وضعك سليم')}
                </StatusBadge>
              </div>
            </div>

            {/* 2. Today's Daily Budget Tracker with Clear Formula */}
            <div className="surface-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted">
                  {t('accountant.dailyBudget', 'ميزانية اليوم')}
                </p>
                <span className="text-[11px] text-muted">
                  {t('accountant.formulaNotice', 'المعادلة: (الرصيد المتاح للإنفاق ÷ الأيام المتبقية)')}
                </span>
              </div>

              <div className="flex items-center gap-4 sm:gap-6">
                <ProgressRing
                  value={ratio}
                  size={96}
                  stroke={9}
                  tone={ringTone}
                  label={t('accountant.dailyBudget', 'ميزانية اليوم')}
                >
                  <span className="text-base font-bold text-fg">{ratio}%</span>
                </ProgressRing>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted">المتاح لليوم:</span>
                    <span className="font-bold text-fg">
                      {formatMoney(plan.dailyBudgetMinor, currency, locale)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted">صرفت اليوم:</span>
                    <span className="font-bold text-fg">
                      {formatMoney(spentToday, currency, locale)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs pt-1 border-t border-line/50">
                    <span className="text-muted">المتبقي لليوم:</span>
                    <span
                      className={`font-bold ${
                        remainingToday > 0 ? 'text-ok' : 'text-danger'
                      }`}
                    >
                      {formatMoney(remainingToday, currency, locale)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Spending Mode Selector (SegmentedControl for 30% / 15% / 5%) */}
            <div className="surface-card p-4 space-y-2.5">
              <p className="text-xs font-bold text-muted">
                {t('accountant.level.label', 'نمط الإنفاق')}
              </p>
              <Segmented
                ariaLabel={t('accountant.level.label', 'نمط الإنفاق')}
                value={plan.level}
                onChange={(newLevel) => void setLevel(newLevel as SpendLevel)}
                options={[
                  { value: 'hard', label: t('accountant.level.hard', '30% قحط') },
                  { value: 'normal', label: t('accountant.level.normal', '15% عادي') },
                  { value: 'easy', label: t('accountant.level.easy', '5% مرتاح') },
                ]}
              />
            </div>

            {/* 4. Three Primary Action Buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <Button
                variant="primary"
                size="md"
                onClick={() => receiptRef.current?.click()}
                icon={<Camera className="h-4 w-4" />}
              >
                {t('accountant.scanReceipt', 'مسح إيصال')}
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => setSheet('manual')}
                icon={<Plus className="h-4 w-4" />}
              >
                {t('accountant.addManual', 'إضافة يدوية')}
              </Button>

              <Button
                variant="secondary"
                size="md"
                loading={openingChat}
                onClick={() => void openAccountantChat()}
                icon={<MessagesSquare className="h-4 w-4" />}
              >
                {t('accountant.consultAccountant', 'استشر المحاسب')}
              </Button>
            </div>
          </div>

          {/* COLUMN 2: Transaction Ledger & Payday Confirmation */}
          <div className="lg:col-span-6 space-y-4">
            {/* Pending Payday Income Confirmation Banner */}
            {pending.length > 0 && (
              <div className="surface-card border-accent/40 bg-accent-soft/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-fg">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span>تأكيد استلام الراتب أو الدخل الشهري</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  حسب جدولك المالي، حان موعد نزول {pending[0].label} بمبلغ{' '}
                  <strong className="text-fg font-bold">
                    {formatMoney(pending[0].amountMinor, currency, locale)}
                  </strong>
                  . هل ترغب في إيداعه بالرصيد؟
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => void confirmIncome(pending[0], true)}
                  >
                    نعم، تم الاستلام
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void confirmIncome(pending[0], false)}
                  >
                    تجاهل الآن
                  </Button>
                </div>
              </div>
            )}

            {/* Transactions Ledger */}
            <div className="surface-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-accent" />
                  <h3 className="font-display text-sm font-bold text-fg">
                    سجل العمليات والمصروفات
                  </h3>
                  <span className="text-xs text-muted">({transactions.length})</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSheet('manual')}
                  icon={<Plus className="h-3.5 w-3.5" />}
                >
                  إضافة
                </Button>
              </div>

              {transactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted space-y-2">
                  <p>لا توجد معاملات مسجلة بعد في هذه الدورة.</p>
                  <p>ابدأ بمسح فاتورة أو إضافة عملية يدوية لمتابعة ميزانيتك بدقة.</p>
                </div>
              ) : (
                <ul className="divide-y divide-line max-h-[380px] overflow-y-auto pe-1">
                  {transactions.slice(0, 30).map((tx) => {
                    const Icon = CATEGORY_ICONS[tx.category] || CATEGORY_ICONS.general;
                    const isIncome = tx.kind === 'income';
                    return (
                      <li
                        key={tx.id}
                        className="group flex items-center justify-between gap-3 py-3 hover:bg-surface2/40 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              isIncome
                                ? 'bg-ok/10 text-ok'
                                : 'bg-surface2 text-muted'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-fg truncate">
                              <bdi dir="auto">{tx.label}</bdi>
                            </p>
                            <p className="text-[11px] text-muted">
                              {formatCalendarDate(tx.occurredAt.slice(0, 10), locale)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-sans text-sm font-bold ${
                              isIncome ? 'text-ok' : 'text-fg'
                            }`}
                          >
                            {isIncome ? '+' : '-'}
                            {formatMoney(tx.amountMinor, currency, locale)}
                          </span>

                          <IconButton
                            label={t('common.delete', 'حذف')}
                            onClick={() => setDeleteTargetId(tx.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for receipts */}
      <input
        ref={receiptRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void onReceipt(event.target.files?.[0])}
      />

      {/* =====================================================================
          SHEET: 1-MINUTE QUICK SETUP
          ===================================================================== */}
      <Sheet
        open={sheet === 'setup'}
        title={t('accountant.setupTitle', 'إعداد الميزانية في دقيقة')}
        onClose={() => setSheet(null)}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted leading-relaxed">
            {t('accountant.setupSubtitle', 'أدخل رصيدك وموعد راتبك لنحسب لك مصروفك اليومي تلقائياً')}
          </p>

          <Input
            label={t('accountant.balance', 'الرصيد الحالي')}
            type="number"
            placeholder="مثال: 50000"
            value={setupBalance}
            onChange={(e) => setSetupBalance(e.target.value)}
          />

          <Input
            label={t('accountant.salaryDay', 'يوم نزول الراتب الشهري (1 - 31)')}
            type="number"
            min={1}
            max={31}
            value={setupSalaryDay}
            onChange={(e) => setSetupSalaryDay(e.target.value)}
          />

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted">
              {t('accountant.savingsRate', 'نسبة الادخار المرغوبة')}
            </label>
            <Segmented
              ariaLabel={t('accountant.savingsRate', 'نسبة الادخار المرغوبة')}
              value={setupLevel}
              onChange={(val) => setSetupLevel(val as SpendLevel)}
              options={[
                { value: 'hard', label: '30% قحط' },
                { value: 'normal', label: '15% عادي' },
                { value: 'easy', label: '5% مرتاح' },
              ]}
            />
          </div>

          <div className="pt-3">
            <Button fullWidth variant="primary" size="lg" onClick={() => void handleQuickSetup()}>
              {t('common.save', 'حفظ وبدء المتابعة')}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* =====================================================================
          SHEET: EDIT BALANCE
          ===================================================================== */}
      <Sheet
        open={sheet === 'balance'}
        title={t('accountant.editBalance', 'تعديل الرصيد الحالي')}
        onClose={() => setSheet(null)}
      >
        <div className="space-y-4 pt-2">
          <Input
            label={t('accountant.balance', 'الرصيد الفعلي في حسابك الآن')}
            type="number"
            value={balanceDraft}
            onChange={(e) => setBalanceDraft(e.target.value)}
          />
          <Button
            fullWidth
            variant="primary"
            size="lg"
            onClick={async () => {
              const minor = majorToMinor(balanceDraft.trim(), currency);
              if (minor !== null && minor >= 0) {
                await setBalance(minor);
                setSheet(null);
                haptic(HAPTIC.tap);
                show(t('common.saved', 'تم تحديث الرصيد'), 'info');
              }
            }}
          >
            {t('common.save', 'حفظ الرصيد')}
          </Button>
        </div>
      </Sheet>

      {/* =====================================================================
          SHEET: MANUAL TRANSACTION ENTRY (4 Fields: Amount, Category, Date, Note)
          ===================================================================== */}
      <Sheet
        open={sheet === 'manual'}
        title={t('accountant.addManual', 'إضافة معاملة')}
        onClose={() => setSheet(null)}
      >
        <div className="space-y-4 pt-2">
          <Input
            label="المبلغ"
            type="number"
            step="any"
            placeholder="0.00"
            value={manual.amount}
            onChange={(e) => setManual((prev) => ({ ...prev, amount: e.target.value }))}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted">الفئة</label>
            <select
              value={manual.category}
              onChange={(e) => setManual((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-xl border border-line bg-surface p-3 text-sm font-semibold text-fg focus:border-accent focus:outline-hidden"
            >
              <option value="food">طعام وبقالة</option>
              <option value="transport">مواصلات ووقود</option>
              <option value="housing">سكن وإيجار</option>
              <option value="health">صحة وعلاج</option>
              <option value="utilities">فواتير وخدمات</option>
              <option value="general">أخرى</option>
            </select>
          </div>

          <Input
            label="التاريخ والوقت"
            type="datetime-local"
            value={toDateTimeLocal(manual.occurredAt, timezone)}
            onChange={(e) =>
              setManual((prev) => ({
                ...prev,
                occurredAt: fromDateTimeLocal(e.target.value, timezone),
              }))
            }
          />

          <Input
            label="ملاحظة أو وصف (اختياري)"
            placeholder="مثال: تسوق سوبرماركت"
            value={manual.label}
            onChange={(e) => setManual((prev) => ({ ...prev, label: e.target.value }))}
          />

          <div className="pt-2">
            <Button fullWidth variant="primary" size="lg" onClick={() => void handleManualSubmit()}>
              {t('common.save', 'حفظ المعاملة')}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* =====================================================================
          SHEET: REVIEW EXTRACTED RECEIPT TRANSACTIONS
          ===================================================================== */}
      {sheet === 'review' && items.length > 0 && (
        <Sheet
          open={true}
          title={t('accountant.reviewTitle', 'مراجعة قبل الحفظ')}
          onClose={() => {
            setItems([]);
            setSheet(null);
          }}
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted leading-relaxed">
              {t('accountant.reviewHint', 'عدّل أي عنصر ثم احفظ. تُسجَّل المصاريف سالبة.')}
            </p>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pe-1">
              {items.map((item, index) => (
                <div key={`${item.label}-${index}`} className="surface-card p-3 space-y-2 border border-line">
                  <div className="flex items-center justify-between">
                    <StatusBadge tone={item.duplicate ? 'warn' : 'neutral'}>
                      {item.duplicate ? t('accountant.duplicate', 'عملية مكررة') : item.category}
                    </StatusBadge>
                    <IconButton
                      label={t('common.delete', 'حذف')}
                      onClick={() => setItems((curr) => curr.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted hover:text-danger" />
                    </IconButton>
                  </div>
                  <Input
                    label={t('accountant.label', 'الوصف')}
                    value={item.label}
                    onChange={(e) =>
                      setItems((curr) =>
                        curr.map((row, i) => (i === index ? { ...row, label: e.target.value } : row)),
                      )
                    }
                  />
                  <Input
                    label={t('accountant.amount', 'المبلغ')}
                    type="number"
                    value={String(item.amountMinor / 100)}
                    onChange={(e) => {
                      const minor = majorToMinor(e.target.value, currency);
                      if (minor !== null) {
                        setItems((curr) =>
                          curr.map((row, i) => (i === index ? { ...row, amountMinor: minor } : row)),
                        );
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            <Button
              fullWidth
              variant="primary"
              size="lg"
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
                setSheet(null);
                haptic(HAPTIC.tap);
                show(t('common.saved', 'تم حفظ جميع العمليات'), 'info');
              }}
            >
              {t('common.save', 'حفظ كل العمليات')}
            </Button>
          </div>
        </Sheet>
      )}

      {/* Confirmation Dialog for Transaction Deletion */}
      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        title="حذف المعاملة"
        message="هل أنت متأكد من حذف هذه المعاملة؟ سيتم إعادة حساب الرصيد وميزانية اليوم فوراً."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        tone="danger"
        onConfirm={async () => {
          if (deleteTargetId) {
            await deleteTransaction(deleteTargetId);
            setDeleteTargetId(null);
            haptic(HAPTIC.tap);
            show('تم حذف المعاملة', 'info');
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Disclaimer */}
      <Disclaimer>
        {t(
          'accountant.disclaimer',
          'المحاسب مساعد توعوي ولا ينفّذ عمليات ولا يقدّم استشارات استثمارية ملزمة.'
        )}
      </Disclaimer>
    </div>
  );
}
