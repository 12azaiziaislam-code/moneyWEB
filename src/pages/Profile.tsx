/**
 * Baraka — Account & Settings
 *
 * Four focused tabs instead of one endless scroll:
 *   me    : identity, completion checklist, health + finance summaries
 *   prefs : school of fiqh (halal checks) + account currency (budget)
 *   app   : appearance, language, motion, AI engine
 *   data  : export, cache, legal, sign-out, delete
 *
 * Deep-linkable with `/profile?tab=prefs`.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronLeft,
  Cpu,
  Database,
  Download,
  FileText,
  Heart,
  Key,
  LogOut,
  Palette,
  RefreshCw,
  Scale,
  Settings2,
  Shield,
  Trash2,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { LOCALE_LABEL, SUPPORTED_CURRENCIES, SUPPORTED_LOCALES } from '../../shared/constants';
import type { AiMode, Locale, Madhhab } from '../../shared/types';
import { PageHeader, UserAvatar } from '../components/AppShell';
import { HealthForm } from '../components/HealthForm';
import { FinanceForm } from '../components/FinanceForm';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { Switch, ThemeSelector } from '../components/ui/Controls';
import { Input } from '../components/ui/Field';
import { cn } from '../components/ui';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { useFinance } from '../data/finance';
import { ACCENTS, ACCENT_SWATCH, systemPrefersDark } from '../lib/theme';
import { changeLocale } from '../i18n';
import { CacheKeys, idbGet, idbSet } from '../lib/idb';
import { apiFetch } from '../lib/api';
import { haptic, HAPTIC } from '../lib/haptics';
import { useProfileCompletion } from '../lib/profileCompletion';

type Tab = 'me' | 'prefs' | 'app' | 'data';
const TABS: { id: Tab; key: string; Icon: LucideIcon }[] = [
  { id: 'me', key: 'profile3.tabMe', Icon: UserRound },
  { id: 'prefs', key: 'profile3.tabPrefs', Icon: Scale },
  { id: 'app', key: 'profile3.tabApp', Icon: Settings2 },
  { id: 'data', key: 'profile3.tabData', Icon: Database },
];

const CURRENCY_META: Record<string, { symbol: string; flag: string }> = {
  RUB: { symbol: '₽', flag: '🇷🇺' },
  SAR: { symbol: 'ر.س', flag: '🇸🇦' },
  AED: { symbol: 'د.إ', flag: '🇦🇪' },
  USD: { symbol: '$', flag: '🇺🇸' },
  EUR: { symbol: '€', flag: '🇪🇺' },
  KZT: { symbol: '₸', flag: '🇰🇿' },
  TRY: { symbol: '₺', flag: '🇹🇷' },
  GBP: { symbol: '£', flag: '🇬🇧' },
};

const MADHHABS: Madhhab[] = ['none', 'hanafi', 'shafii', 'maliki', 'hanbali'];

/* -------------------------------------------------------------------------- */
/* Building blocks                                                             */
/* -------------------------------------------------------------------------- */
function Panel({
  icon: Icon,
  title,
  desc,
  action,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  desc?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface p-5 shadow-e1 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-fg">{title}</h2>
            {desc ? <p className="mt-0.5 text-sm leading-relaxed text-muted">{desc}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-surface2/70 px-3.5 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num mt-1 truncate text-sm font-bold text-fg">{value}</dd>
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  desc,
  end,
  onClick,
  to,
  tone = 'default',
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  end?: ReactNode;
  onClick?: () => void;
  to?: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  const body = (
    <>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-surface2 text-muted',
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm font-bold', tone === 'danger' ? 'text-danger' : 'text-fg')}>{title}</span>
        {desc ? <span className="mt-0.5 block text-xs text-muted">{desc}</span> : null}
      </span>
      {end ?? <ChevronLeft className="h-4 w-4 shrink-0 text-muted-soft ltr:rotate-180" aria-hidden />}
    </>
  );
  const cls = cn(
    'flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors sm:px-5',
    disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-surface2/70',
  );
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {body}
    </button>
  );
}

function RadioTile({
  selected,
  onClick,
  title,
  desc,
  leading,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
  leading?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border p-3.5 text-start transition-all',
        selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-fg/20 hover:bg-surface2/60',
      )}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-fg">{title}</span>
        {desc ? <span className="mt-0.5 block text-xs leading-relaxed text-muted">{desc}</span> : null}
      </span>
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected ? 'border-accent bg-accent text-accent-fg' : 'border-line',
        )}
      >
        {selected ? <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden /> : null}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */
export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { show } = useToast();
  const {
    role,
    user,
    signOut,
    exitGuest,
    deleteAccount,
    accent,
    setAccent,
    themeMode,
    setThemeMode,
    updateGuestSettings,
    patchUser,
  } = useAuth();
  const { health, finance } = useFinance();
  const completion = useProfileCompletion();

  const [tab, setTab] = useState<Tab>('me');
  const [sheet, setSheet] = useState<'health' | 'money' | 'delete' | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ownKey, setOwnKey] = useState({ baseUrl: '', apiKey: '', model: '' });
  const [savingKey, setSavingKey] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>(user?.aiMode ?? 'builtin');
  const [reducedMotion, setReducedMotion] = useState(() => {
    try {
      return localStorage.getItem('baraka.reducedMotion') === '1';
    } catch {
      return false;
    }
  });

  const isGuest = role === 'guest';
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark());
  const activeCurrency = user?.currency || finance.currency || 'RUB';
  const activeMadhhab: Madhhab = user?.madhhab ?? 'none';
  const name = isGuest ? t('guest.title') : user?.displayName || user?.email || '—';

  // Deep link: /profile?tab=prefs
  useEffect(() => {
    if (!location.pathname.startsWith('/profile')) return;
    const requested = new URLSearchParams(location.search).get('tab') as Tab | null;
    if (requested && TABS.some((item) => item.id === requested)) setTab(requested);
  }, [location.pathname, location.search]);

  useEffect(() => {
    void idbGet<{ baseUrl: string; apiKey: string; model: string }>(CacheKeys.ownKey).then((stored) => {
      if (stored) setOwnKey(stored);
    });
  }, []);

  useEffect(() => {
    if (user?.aiMode) setAiMode(user.aiMode);
  }, [user?.aiMode]);

  const healthItems = useMemo(
    () => [...(health.conditions ?? []), ...(health.medications ?? []), ...(health.allergies ?? [])],
    [health.allergies, health.conditions, health.medications],
  );

  const saved = () => {
    haptic(HAPTIC.tap);
    show(t('profile3.saved'), 'info');
  };
  const failed = () => show(t('errors.generic'), 'danger');

  const saveLocale = async (next: Locale) => {
    try {
      await changeLocale(next);
      if (isGuest) await updateGuestSettings({ locale: next });
      else await patchUser({ locale: next });
      saved();
    } catch {
      failed();
    }
  };

  const saveCurrency = async (currency: string) => {
    try {
      if (isGuest) await updateGuestSettings({ currency });
      else await patchUser({ currency });
      saved();
    } catch {
      failed();
    }
  };

  const saveMadhhab = async (madhhab: Madhhab) => {
    try {
      if (isGuest) await updateGuestSettings({ madhhab });
      else await patchUser({ madhhab });
      saved();
    } catch {
      failed();
    }
  };

  const saveAiMode = async (mode: AiMode) => {
    setAiMode(mode);
    try {
      if (!isGuest) await patchUser({ aiMode: mode });
      haptic(HAPTIC.tap);
    } catch {
      failed();
    }
  };

  const saveOwnKey = async () => {
    setSavingKey(true);
    try {
      await idbSet(CacheKeys.ownKey, ownKey);
      if (!isGuest) await patchUser({ aiMode: 'own' });
      haptic(HAPTIC.tap);
      show(t('profile3.keySaved'), 'info');
    } catch {
      failed();
    } finally {
      setSavingKey(false);
    }
  };

  const toggleReducedMotion = (enabled: boolean) => {
    setReducedMotion(enabled);
    try {
      localStorage.setItem('baraka.reducedMotion', enabled ? '1' : '0');
    } catch {
      /* private mode */
    }
    document.documentElement.classList.toggle('reduce-motion', enabled);
    haptic(HAPTIC.tap);
  };

  const clearAppCache = async () => {
    setBusy(true);
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
      show(t('profile3.cacheDone'), 'info');
    }
  };

  const exportData = async () => {
    if (isGuest) {
      show(t('guest.noExport'), 'warning');
      return;
    }
    setBusy(true);
    try {
      const data = await apiFetch<Record<string, unknown>>('/api/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `baraka-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      haptic(HAPTIC.tap);
    } catch {
      failed();
    } finally {
      setBusy(false);
    }
  };

  const selectTab = (next: Tab) => {
    setTab(next);
    haptic(HAPTIC.tap);
    if (location.search) navigate('/profile', { replace: true });
  };

  /* ------------------------------ Tab bodies ------------------------------ */
  const meTab = (
    <div className="space-y-5">
      {/* Identity + completion */}
      <section className="hero-surface relative overflow-hidden rounded-xl border border-line p-5 sm:p-6">
        <div className="relative z-[1] flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <UserAvatar size={56} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold text-fg">{name}</p>
              <p className="truncate text-sm text-muted">{isGuest ? t('guest.localOnly') : user?.email}</p>
            </div>
          </div>
          <div className="w-full sm:w-56">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted">{t('profile3.completion')}</span>
              <span className="num font-bold text-fg">{completion.percent}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface2">
              <div
                className={cn('h-full rounded-full transition-all', completion.percent === 100 ? 'bg-ok' : 'bg-accent')}
                style={{ width: `${Math.max(4, completion.percent)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {t('profile3.stepsLeft', { done: completion.done, total: completion.total })}
            </p>
          </div>
        </div>

        {completion.percent < 100 ? (
          <div className="relative z-[1] mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            {completion.steps.map((step) => (
              <button
                key={step.id}
                type="button"
                disabled={step.done}
                onClick={() => (step.target === 'prefs' ? selectTab('prefs') : setSheet(step.target))}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  step.done
                    ? 'border-transparent bg-ok-soft text-ok'
                    : 'border-line bg-surface text-fg hover:border-accent hover:text-accent',
                )}
              >
                {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                {t(step.labelKey)}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel
          icon={Heart}
          title={t('profile3.healthTitle')}
          desc={t('profile3.healthDesc')}
          action={
            <Button size="sm" variant="secondary" onClick={() => setSheet('health')}>
              {t('profile3.edit')}
            </Button>
          }
        >
          <dl className="grid grid-cols-3 gap-2">
            <Stat label={t('profile3.age')} value={health.age ? `${health.age} ${t('profile3.years')}` : '—'} />
            <Stat label={t('profile3.weight')} value={health.weightKg ? `${health.weightKg} ${t('profile3.kg')}` : '—'} />
            <Stat label={t('profile3.height')} value={health.heightCm ? `${health.heightCm} ${t('profile3.cm')}` : '—'} />
          </dl>
          <div className="mt-3">
            <p className="text-xs text-muted">{t('profile3.conditions')}</p>
            {healthItems.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {healthItems.map((item) => (
                  <span key={item} className="rounded-full bg-surface2 px-2.5 py-1 text-xs font-semibold text-fg">
                    <bdi dir="auto">{item}</bdi>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-soft">{t('profile3.noneRecorded')}</p>
            )}
          </div>
        </Panel>

        <Panel
          icon={Wallet}
          title={t('profile3.moneyTitle')}
          desc={t('profile3.moneyDesc')}
          action={
            <Button size="sm" variant="secondary" onClick={() => setSheet('money')}>
              {t('profile3.edit')}
            </Button>
          }
        >
          <dl className="grid grid-cols-3 gap-2">
            <Stat label={t('profile3.incomes')} value={finance.incomes?.length ?? 0} />
            <Stat label={t('profile3.fixed')} value={finance.fixedExpenses?.length ?? 0} />
            <Stat label={t('profile3.style')} value={t(`accountant.level.${finance.level}`)} />
          </dl>
        </Panel>
      </div>
    </div>
  );

  const prefsTab = (
    <div className="space-y-5">
      <Panel icon={Scale} title={t('profile3.madhhabTitle')} desc={t('profile3.madhhabDesc')}>
        <div role="radiogroup" aria-label={t('profile3.madhhabTitle')} className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {MADHHABS.map((id) => (
            <RadioTile
              key={id}
              selected={activeMadhhab === id}
              onClick={() => void saveMadhhab(id)}
              title={t(`profile.madhhabs.${id}`)}
              desc={t(`profile3.madhhabDescs.${id}`)}
            />
          ))}
        </div>
      </Panel>

      <Panel
        icon={Wallet}
        title={t('profile3.currencyTitle')}
        desc={t('profile3.currencyDesc')}
        action={<span className="num rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">{activeCurrency}</span>}
      >
        <div role="radiogroup" aria-label={t('profile3.currencyTitle')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SUPPORTED_CURRENCIES.map((code) => {
            const meta = CURRENCY_META[code] ?? { symbol: code, flag: '🌐' };
            const active = activeCurrency === code;
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => void saveCurrency(code)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-start transition-all',
                  active ? 'border-accent bg-accent-soft' : 'border-line hover:border-fg/20 hover:bg-surface2/60',
                )}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {meta.flag}
                </span>
                <span className="num flex-1 text-sm font-bold text-fg">{code}</span>
                <span className="text-xs font-semibold text-muted">{meta.symbol}</span>
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );

  const appTab = (
    <div className="space-y-5">
      <Panel icon={Palette} title={t('profile3.appearanceTitle')}>
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-semibold text-fg">{t('profile.theme')}</p>
            <ThemeSelector
              value={themeMode}
              onChange={(mode) => {
                setThemeMode(mode);
                if (!isGuest) void patchUser({ theme: mode });
              }}
              labels={{ system: t('theme.system'), light: t('theme.light'), dark: t('theme.dark') }}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-fg">{t('profile3.accent')}</p>
            <div className="flex flex-wrap gap-3">
              {ACCENTS.map((item) => {
                const active = accent === item;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-label={item}
                    aria-pressed={active}
                    title={item}
                    onClick={() => setAccent(item)}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-full transition-all',
                      active ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : 'hover:scale-105',
                    )}
                    style={{ background: ACCENT_SWATCH[item][isDark ? 'dark' : 'light'] }}
                  >
                    {active ? <Check className="h-4 w-4 text-white mix-blend-difference" strokeWidth={3} aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-fg">{t('profile3.language')}</p>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_LOCALES.map((loc: Locale) => {
                const active = i18n.language === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    aria-pressed={active}
                    onClick={() => void saveLocale(loc)}
                    className={cn(
                      'min-h-[44px] rounded-lg border text-sm font-bold transition-all',
                      active ? 'border-accent bg-accent text-accent-fg' : 'border-line text-muted hover:text-fg',
                    )}
                  >
                    {LOCALE_LABEL[loc]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <Switch
              label={t('profile3.motion')}
              description={t('profile3.motionHint')}
              checked={reducedMotion}
              onChange={toggleReducedMotion}
            />
          </div>
        </div>
      </Panel>

      <Panel icon={Cpu} title={t('profile3.aiTitle')} desc={t('profile3.aiDesc')}>
        <div role="radiogroup" aria-label={t('profile3.aiTitle')} className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <RadioTile
            selected={aiMode === 'builtin'}
            onClick={() => void saveAiMode('builtin')}
            title={t('profile3.aiBuiltin')}
            desc={t('profile3.aiBuiltinDesc')}
          />
          <RadioTile
            selected={aiMode === 'own'}
            onClick={() => void saveAiMode('own')}
            title={t('profile3.aiOwn')}
            desc={t('profile3.aiOwnDesc')}
          />
        </div>

        {aiMode === 'own' ? (
          <div className="mt-4 space-y-3 rounded-lg border border-line bg-surface2/50 p-4">
            <p className="flex items-center gap-2 text-xs text-muted">
              <Key className="h-4 w-4 text-accent" aria-hidden />
              {t('profile.ownHint')}
            </p>
            <Input
              label={t('profile.baseUrl')}
              placeholder="https://api.openai.com/v1"
              value={ownKey.baseUrl}
              onChange={(event) => setOwnKey({ ...ownKey, baseUrl: event.target.value })}
            />
            <Input
              label={t('profile.apiKey')}
              type="password"
              placeholder="sk-..."
              value={ownKey.apiKey}
              onChange={(event) => setOwnKey({ ...ownKey, apiKey: event.target.value })}
            />
            <Input
              label={t('profile.model')}
              placeholder="gpt-4o-mini"
              value={ownKey.model}
              onChange={(event) => setOwnKey({ ...ownKey, model: event.target.value })}
            />
            <Button fullWidth loading={savingKey} onClick={() => void saveOwnKey()}>
              {t('profile3.saveKey')}
            </Button>
          </div>
        ) : null}
      </Panel>
    </div>
  );

  const dataTab = (
    <div className="space-y-5">
      <div>
        <p className="mb-2 px-1 text-xs font-semibold text-muted">{t('profile3.dataTitle')}</p>
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-e1">
          <Row
            icon={Download}
            title={t('profile3.export')}
            desc={isGuest ? t('profile3.guestLocked') : t('profile3.exportDesc')}
            onClick={() => void exportData()}
            disabled={busy || isGuest}
          />
          <Row
            icon={RefreshCw}
            title={t('profile3.cache')}
            desc={t('profile3.cacheDesc')}
            onClick={() => void clearAppCache()}
            disabled={busy}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 px-1 text-xs font-semibold text-muted">{t('profile3.legalTitle')}</p>
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-e1">
          <Row icon={Shield} title={t('profile.privacy')} to="/legal/privacy" />
          <Row icon={FileText} title={t('profile.terms')} to="/legal/terms" />
        </div>
      </div>

      <div>
        <p className="mb-2 px-1 text-xs font-semibold text-muted">{t('profile3.sessionTitle')}</p>
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-e1">
          <Row
            icon={LogOut}
            title={isGuest ? t('guest.exitTitle') : t('auth.signOut')}
            desc={isGuest ? t('guest.exitBody') : undefined}
            onClick={() => void (isGuest ? exitGuest() : signOut())}
          />
          {!isGuest ? (
            <Row
              icon={Trash2}
              tone="danger"
              title={t('profile.deleteAccount')}
              desc={t('profile3.irreversible')}
              onClick={() => {
                setDeleteInput('');
                setSheet('delete');
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  const body = { me: meTab, prefs: prefsTab, app: appTab, data: dataTab }[tab];

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={t('nav.profile')} subtitle={t('profile3.subtitle')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
        {/* Tab list — horizontal on mobile, vertical on desktop */}
        <nav aria-label={t('nav.profile')} className="-mx-4 px-4 sm:mx-0 sm:px-0 lg:sticky lg:top-0 lg:self-start">
          <div role="tablist" className="flex gap-1.5 overflow-x-auto no-scrollbar lg:flex-col">
            {TABS.map(({ id, key, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectTab(id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors lg:rounded-md lg:px-3 lg:py-2.5',
                    active
                      ? 'bg-fg text-bg lg:bg-surface2 lg:text-fg'
                      : 'bg-surface2/60 text-muted hover:text-fg lg:bg-transparent lg:hover:bg-surface2/60',
                  )}
                >
                  <Icon className={cn('h-4 w-4', active && 'lg:text-accent')} aria-hidden />
                  {t(key)}
                </button>
              );
            })}
          </div>
        </nav>

        <div key={tab} className="min-w-0 animate-rise">
          {body}
        </div>
      </div>

      {/* Sheets */}
      <Sheet open={sheet === 'health'} title={t('profile3.healthTitle')} onClose={() => setSheet(null)} size="tall">
        <HealthForm initial={health} onSaved={() => setSheet(null)} />
      </Sheet>

      <Sheet open={sheet === 'money'} title={t('profile3.moneyTitle')} onClose={() => setSheet(null)} size="tall">
        <FinanceForm initial={finance} onSaved={() => setSheet(null)} />
      </Sheet>

      <Sheet open={sheet === 'delete'} title={t('profile.deleteAccount')} onClose={() => setSheet(null)}>
        <div className="space-y-4">
          <div className="rounded-lg border border-danger/30 bg-danger-soft p-4">
            <p className="text-sm font-bold text-danger">{t('profile3.irreversible')}</p>
            <p className="mt-1 text-sm leading-relaxed text-fg">{t('profile.deleteWarning')}</p>
          </div>
          <Input label={t('profile3.deleteType')} value={deleteInput} onChange={(event) => setDeleteInput(event.target.value)} />
          <Button
            variant="danger"
            fullWidth
            size="lg"
            loading={busy}
            disabled={deleteInput.trim() !== 'حذف' && deleteInput.trim().toLowerCase() !== 'delete'}
            onClick={async () => {
              setBusy(true);
              try {
                await deleteAccount();
                navigate('/');
              } catch {
                failed();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('profile.deleteConfirm')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
