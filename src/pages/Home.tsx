/**
 * Baraka v2 — Home Dashboard (الرئيسية)
 * 1. Warm greeting with user name + single-line tagline.
 * 2. Three equal prominent cards: "افحص منتجاً", "اسأل عن دواء أو طعام", "ميزانية اليوم".
 * 3. Recent activity list (last 3 consultations).
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronLeft,
  Clock,
  Sparkles,
  MessagesSquare,
} from 'lucide-react';
import { PageHeader } from '../components/AppShell';
import { Button } from '../components/ui/Button';
import { StatusBadge, Skeleton } from '../components/ui/Feedback';
import { PersonaAvatar } from '../components/characters/Personas';
import { useAuth } from '../state/AuthContext';
import { useFinance } from '../data/finance';
import { useChatList } from '../data/chats';
import { formatMoney } from '../../shared/money';
import { localDateISO } from '../../shared/payday';
import { formatRelativeTime } from '../lib/format';
import { usePageTheme } from '../lib/theme';
import type { Locale } from '../i18n';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { plan, transactions, currency, timezone } = useFinance();
  const { chats, loading: chatsLoading } = useChatList('all', '');
  usePageTheme('halal');

  const locale = (user?.locale ?? i18n.language ?? 'ar') as Locale;
  const isGuest = role === 'guest';
  const rawName = isGuest ? null : user?.displayName || user?.email?.split('@')[0];
  const greetingName = rawName || (locale === 'ar' ? 'أخي الكريم' : locale === 'ru' ? 'друг' : 'friend');

  // Calculate today's spent amount for daily budget card
  const spentToday = useMemo(() => {
    const today = localDateISO(new Date().toISOString(), timezone);
    return transactions
      .filter((tx) => tx.kind === 'expense' && localDateISO(tx.occurredAt, timezone) === today)
      .reduce((total, tx) => total + tx.amountMinor, 0);
  }, [timezone, transactions]);

  const dailyRemaining = plan ? Math.max(0, plan.dailyBudgetMinor - spentToday) : null;
  const recentChats = useMemo(() => chats.slice(0, 3), [chats]);

  return (
    <div className="flex flex-1 flex-col gap-6 pb-12">
      {/* 1. Welcoming Header */}
      <PageHeader
        title={`${t('home.salam')}${greetingName ? `، ${greetingName}` : ''}`}
        subtitle={t('app.tagline', 'حلالك، طبيبك، ومحاسبك في تطبيق واحد')}
      />

      {/* 2. Three Equal Prominent Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: فحص الحلال */}
        <div
          onClick={() => navigate('/halal')}
          className="group surface-card p-5 hover:border-accent/40 hover:shadow-e2 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PersonaAvatar kind="sheikh" size="md" />
                <div>
                  <p className="font-display text-sm font-bold text-fg">مساعد الحلال</p>
                  <p className="text-[11px] text-muted">فحص المكونات</p>
                </div>
              </div>
              <StatusBadge tone="accent" icon={<Sparkles className="h-3.5 w-3.5" />}>
                {t('nav.halal')}
              </StatusBadge>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-fg group-hover:text-accent transition-colors">
                {t('landing.cap1Title', 'افحص منتجاً')}
              </h2>
              <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                {t('landing.cap1Desc', 'صوّر قائمة المكونات للتحقق الفوري من الحكم الشرعي ومواضع الشبهات.')}
              </p>
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-line/50 flex items-center justify-between text-xs font-bold text-accent">
            <span>{t('halal.scan', 'بدء الفحص')}</span>
            <ArrowLeft className="flip-rtl h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </div>
        </div>

        {/* Card 2: استشارة الطبيب */}
        <div
          onClick={() => navigate('/doctor')}
          className="group surface-card p-5 hover:border-info/40 hover:shadow-e2 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PersonaAvatar kind="doctor" size="md" />
                <div>
                  <p className="font-display text-sm font-bold text-fg">الطبيب</p>
                  <p className="text-[11px] text-muted">الاستشارة الصحية</p>
                </div>
              </div>
              <StatusBadge tone="info" icon={<Sparkles className="h-3.5 w-3.5" />}>
                {t('nav.doctor')}
              </StatusBadge>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-fg group-hover:text-info transition-colors">
                {t('doctor.title', 'اسأل عن دواء أو طعام')}
              </h2>
              <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                {t('doctor.subtitle', 'فحص ملاءمة الأدوية والأعراض والحساسيات وفق ملفك الطبي الشخصي.')}
              </p>
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-line/50 flex items-center justify-between text-xs font-bold text-info">
            <span>{t('doctor.discuss', 'استشارة الطبيب')}</span>
            <ArrowLeft className="flip-rtl h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </div>
        </div>

        {/* Card 3: ميزانية اليوم */}
        <div
          onClick={() => navigate('/accountant')}
          className="group surface-card p-5 hover:border-warn/40 hover:shadow-e2 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PersonaAvatar kind="accountant" size="md" />
                <div>
                  <p className="font-display text-sm font-bold text-fg">المحاسب</p>
                  <p className="text-[11px] text-muted">إدارة الميزانية</p>
                </div>
              </div>
              <StatusBadge tone={plan?.danger === 'red' ? 'danger' : 'warn'} icon={<Sparkles className="h-3.5 w-3.5" />}>
                {t('nav.accountant')}
              </StatusBadge>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-fg group-hover:text-warn transition-colors">
                {t('accountant.dailyBudget', 'ميزانية اليوم')}
              </h2>
              {plan && dailyRemaining !== null ? (
                <div className="mt-1 space-y-0.5">
                  <p className="num font-display text-xl font-extrabold text-fg">
                    <bdi dir="ltr">{formatMoney(dailyRemaining, currency, locale)}</bdi>
                  </p>
                  <p className="text-[11px] text-muted">
                    {t('accountant.daysLeft', { count: plan.daysLeft })}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                  {t('accountant.openSettings', 'أكمل إعداد دخلك ومصاريفك لحساب سقف الصرف اليومي بدقة.')}
                </p>
              )}
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-line/50 flex items-center justify-between text-xs font-bold text-warn">
            <span>{plan ? t('accountant.title') : t('accountant.openSettings')}</span>
            <ArrowLeft className="flip-rtl h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </div>
        </div>
      </div>

      {/* 3. Recent Activity Section */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            <h2 className="font-display text-base font-bold text-fg">
              {t('chats.title', 'آخر النشاطات والمحادثات')}
            </h2>
          </div>
          {chats.length > 0 ? (
            <button
              type="button"
              onClick={() => navigate('/chats')}
              className="text-xs font-bold text-accent hover:underline cursor-pointer"
            >
              {t('common.all', 'عرض الكل')} ({chats.length})
            </button>
          ) : null}
        </div>

        {chatsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-18 w-full rounded-lg" />
            <Skeleton className="h-18 w-full rounded-lg" />
          </div>
        ) : recentChats.length > 0 ? (
          <div className="surface-card divide-y divide-line/60 overflow-hidden">
            {recentChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chats/${chat.id}`)}
                className="flex items-center justify-between gap-3 p-3.5 hover:bg-surface2 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <PersonaAvatar kind={chat.kind} size="sm" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-sm font-bold text-fg truncate">
                        <bdi dir="auto">{chat.title}</bdi>
                      </p>
                      <StatusBadge tone="neutral" className="text-[10px] py-0 px-1.5 shrink-0">
                        {t(`chats.kinds.${chat.kind}`)}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-muted truncate leading-relaxed">
                      <bdi dir="auto">{chat.preview || '—'}</bdi>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-muted">
                  <span className="text-[11px] font-medium hidden sm:inline">
                    {formatRelativeTime(chat.updatedAt, locale)}
                  </span>
                  <ChevronLeft className="flip-rtl h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-card p-6 text-center space-y-3">
            <MessagesSquare className="h-10 w-10 text-muted mx-auto" strokeWidth={1.5} />
            <div className="space-y-1">
              <p className="font-display text-sm font-bold text-fg">
                {t('chats.empty', 'لا توجد محادثات بعد')}
              </p>
              <p className="text-xs text-muted max-w-[36ch] mx-auto leading-relaxed">
                {t('chats.emptyHint', 'ابدأ بفحص منتج، أو استشارة الطبيب، أو تنظيم الميزانية.')}
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/halal')}>
                {t('nav.halal')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/doctor')}>
                {t('nav.doctor')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/accountant')}>
                {t('nav.accountant')}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
