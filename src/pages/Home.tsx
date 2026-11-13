/**
 * Baraka — Home
 * 1. Hero: time-aware greeting, date, and (for guests) one clear upgrade path.
 * 2. Tools: three equal cards — one job each, one call to action each.
 * 3. Side column: today's budget snapshot + profile completion.
 * 4. Recent activity.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, ChevronLeft, MessagesSquare, ShieldCheck, Stethoscope, Wallet, type LucideIcon } from 'lucide-react';
import { MoreLink, SectionTitle } from '../components/AppShell';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Feedback';
import { cn } from '../components/ui';
import { PersonaAvatar, type PersonaKind } from '../components/characters/Personas';
import { useAuth } from '../state/AuthContext';
import { useFinance } from '../data/finance';
import { useChatList } from '../data/chats';
import { formatMoney } from '../../shared/money';
import { localDateISO } from '../../shared/payday';
import { formatRelativeTime } from '../lib/format';
import { useProfileCompletion } from '../lib/profileCompletion';
import type { Locale } from '../i18n';

interface Tool {
  to: string;
  persona: PersonaKind;
  Icon: LucideIcon;
  tone: string;
  soft: string;
  title: string;
  desc: string;
  cta: string;
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, role, signIn } = useAuth();
  const { plan, transactions, currency, timezone, finance } = useFinance();
  const { chats, loading: chatsLoading } = useChatList('all', '');
  const completion = useProfileCompletion();

  const locale = (user?.locale ?? i18n.language ?? 'ar') as Locale;
  const isGuest = role === 'guest';
  const firstName = isGuest ? '' : (user?.displayName || user?.email?.split('@')[0] || '').split(' ')[0];

  const hour = new Date().getHours();
  const greeting = hour >= 4 && hour < 12 ? t('home2.greetMorning') : t('home2.greetEvening');
  const today = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const isConfigured = Boolean(plan && (plan.balanceMinor > 0 || finance.incomes?.length));
  const spentToday = useMemo(() => {
    const day = localDateISO(new Date().toISOString(), timezone);
    return transactions
      .filter((tx) => tx.kind === 'expense' && localDateISO(tx.occurredAt, timezone) === day)
      .reduce((total, tx) => total + tx.amountMinor, 0);
  }, [timezone, transactions]);
  const dailyRemaining = plan ? Math.max(0, plan.dailyBudgetMinor - spentToday) : 0;
  const spentRatio = plan && plan.dailyBudgetMinor > 0 ? Math.min(100, (spentToday / plan.dailyBudgetMinor) * 100) : 0;
  const recentChats = useMemo(() => chats.slice(0, 4), [chats]);

  const tools: Tool[] = [
    {
      to: '/halal',
      persona: 'sheikh',
      Icon: ShieldCheck,
      tone: 'var(--tool-halal)',
      soft: 'var(--tool-halal-soft)',
      title: t('home2.halalTitle'),
      desc: t('home2.halalDesc'),
      cta: t('home2.halalCta'),
    },
    {
      to: '/doctor',
      persona: 'doctor',
      Icon: Stethoscope,
      tone: 'var(--tool-doctor)',
      soft: 'var(--tool-doctor-soft)',
      title: t('home2.doctorTitle'),
      desc: t('home2.doctorDesc'),
      cta: t('home2.doctorCta'),
    },
    {
      to: '/accountant',
      persona: 'accountant',
      Icon: Wallet,
      tone: 'var(--tool-money)',
      soft: 'var(--tool-money-soft)',
      title: t('home2.moneyTitle'),
      desc: t('home2.moneyDesc'),
      cta: isConfigured ? t('home2.moneyCta') : t('home2.moneySetup'),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-8 lg:gap-10">
      {/* 1. HERO ------------------------------------------------------------ */}
      <section className="hero-surface relative overflow-hidden rounded-2xl border border-line p-6 sm:p-8">
        <div className="relative z-[1] flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted">{today}</p>
            <h1 className="mt-2 font-display text-[1.75rem] font-bold leading-tight text-fg sm:text-4xl">
              {greeting}
              {firstName ? <span className="text-accent">، {firstName}</span> : null}
            </h1>
            <p className="mt-2 text-base text-muted sm:text-lg">{t('home2.heroQuestion')}</p>
          </div>

          {isGuest ? (
            <div className="w-full rounded-xl border border-line bg-surface/80 p-4 backdrop-blur lg:hidden">
              <p className="text-sm font-bold text-fg">{t('home2.guestTitle')}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t('home2.guestBody')}</p>
              <Button size="sm" className="mt-3" onClick={() => void signIn()}>
                {t('home2.guestCta')}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* 2. TOOLS ----------------------------------------------------------- */}
      <section>
        <SectionTitle title={t('home2.toolsTitle')} hint={t('home2.toolsHint')} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {tools.map((tool) => (
            <button
              key={tool.to}
              type="button"
              onClick={() => navigate(tool.to)}
              className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-line bg-surface p-4 text-start shadow-e1 transition-all duration-mid hover:-translate-y-0.5 hover:shadow-e2 md:flex-col md:items-stretch md:gap-0 md:p-5"
            >
              <span
                className="pointer-events-none absolute -end-16 -top-16 h-40 w-40 rounded-full opacity-70 blur-2xl transition-opacity group-hover:opacity-100"
                style={{ background: tool.soft }}
                aria-hidden
              />
              <span
                className="absolute inset-y-0 start-0 w-[3px] md:inset-x-0 md:bottom-auto md:h-[3px] md:w-auto"
                style={{ background: tool.tone }}
                aria-hidden
              />

              <div className="relative flex shrink-0 items-center justify-between">
                <PersonaAvatar kind={tool.persona} size="lg" />
                <span
                  className="hidden h-10 w-10 items-center justify-center rounded-full md:flex"
                  style={{ background: tool.soft, color: tool.tone }}
                >
                  <tool.Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
              </div>

              <span className="relative flex min-w-0 flex-1 flex-col">
              <span className="block font-display text-lg font-bold text-fg md:mt-5 md:text-xl">{tool.title}</span>
              <span className="mt-1 block flex-1 text-sm leading-relaxed text-muted md:mt-1.5">{tool.desc}</span>

              <span
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold md:mt-5"
                style={{ color: tool.tone }}
              >
                {tool.cta}
                <ArrowLeft
                  className="h-4 w-4 transition-transform duration-mid group-hover:-translate-x-1 ltr:rotate-180 ltr:group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. TODAY + RECENT -------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        {/* Recent activity */}
        <section className="min-w-0 lg:order-1">
          <SectionTitle
            title={t('home2.recentTitle')}
            action={chats.length > 0 ? <MoreLink onClick={() => navigate('/chats')}>{t('home2.viewAll')}</MoreLink> : null}
          />

          {chatsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-[72px] w-full rounded-lg" />
              <Skeleton className="h-[72px] w-full rounded-lg" />
            </div>
          ) : recentChats.length > 0 ? (
            <ul className="overflow-hidden rounded-xl border border-line bg-surface shadow-e1">
              {recentChats.map((chat, index) => (
                <li key={chat.id} className={cn(index > 0 && 'border-t border-line')}>
                  <button
                    type="button"
                    onClick={() => navigate(`/chats/${chat.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-surface2"
                  >
                    <PersonaAvatar kind={chat.kind === 'shaykh' ? 'sheikh' : (chat.kind as PersonaKind)} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-fg">
                          <bdi dir="auto">{chat.title}</bdi>
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        <span className="font-semibold">{t(`chats.kinds.${chat.kind}`)}</span>
                        {chat.preview ? (
                          <>
                            {' · '}
                            <bdi dir="auto">{chat.preview}</bdi>
                          </>
                        ) : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-soft">{formatRelativeTime(chat.updatedAt, locale)}</span>
                    <ChevronLeft className="h-4 w-4 shrink-0 text-muted-soft ltr:rotate-180" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-surface/50 px-6 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface2 text-muted">
                <MessagesSquare className="h-6 w-6" strokeWidth={1.6} aria-hidden />
              </span>
              <p className="mt-3 font-display text-base font-bold text-fg">{t('home2.emptyRecent')}</p>
              <p className="mt-1 max-w-[38ch] text-sm leading-relaxed text-muted">{t('home2.emptyRecentHint')}</p>
            </div>
          )}
        </section>

        {/* Side column */}
        <aside className="flex flex-col gap-4 lg:order-2">
          {/* Budget snapshot */}
          <button
            type="button"
            onClick={() => navigate('/accountant')}
            className="group rounded-xl border border-line bg-surface p-5 text-start shadow-e1 transition-shadow hover:shadow-e2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted">{t('home2.todayLeft')}</span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: 'var(--tool-money-soft)', color: 'var(--tool-money)' }}
              >
                <Wallet className="h-4 w-4" aria-hidden />
              </span>
            </div>
            {isConfigured && plan ? (
              <>
                <p className="num mt-2 font-display text-3xl font-bold text-fg">
                  <bdi dir="ltr">{formatMoney(dailyRemaining, currency, locale)}</bdi>
                </p>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                  <div
                    className={cn('h-full rounded-full', spentRatio >= 100 ? 'bg-danger' : spentRatio >= 75 ? 'bg-warn' : 'bg-ok')}
                    style={{ width: `${Math.max(4, spentRatio)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted">{t('home2.daysToPayday', { count: plan.daysLeft })}</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t('home2.moneyDesc')}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-accent">
                  {t('home2.moneySetup')}
                  <ArrowLeft className="h-4 w-4 ltr:rotate-180" aria-hidden />
                </span>
              </>
            )}
          </button>

          {/* Profile completion */}
          {completion.percent < 100 ? (
            <div className="rounded-xl border border-line bg-surface p-5 shadow-e1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-muted">{t('home2.profileTitle')}</span>
                <span className="num text-sm font-bold text-fg">{completion.percent}%</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(4, completion.percent)}%` }} />
              </div>
              <ul className="mt-4 space-y-2">
                {completion.steps.map((step) => (
                  <li key={step.id} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        step.done ? 'border-ok bg-ok text-ok-fg' : 'border-line text-transparent',
                      )}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                    </span>
                    <span className={step.done ? 'text-muted line-through decoration-line' : 'text-fg'}>{t(step.labelKey)}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="secondary"
                fullWidth
                className="mt-4"
                onClick={() => navigate(`/profile?tab=${completion.steps.find((s) => !s.done)?.target === 'prefs' ? 'prefs' : 'me'}`)}
              >
                {t('home2.profileCta')}
              </Button>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
