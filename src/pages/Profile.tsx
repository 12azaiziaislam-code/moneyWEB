/** Profile: identity, sections, appearance, guest actions, privacy and danger zone. */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Download, LogOut, Trash2, UserX } from 'lucide-react';
import { LOCALE_LABEL, SUPPORTED_LOCALES } from '../../shared/constants';
import { PageHeader } from '../components/AppShell';
import { HealthForm } from '../components/HealthForm';
import { FinanceForm } from '../components/FinanceForm';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Feedback';
import { Sheet } from '../components/ui/Sheet';
import { Switch } from '../components/ui/Controls';
import { SectionHeader, cn } from '../components/ui';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { useFinance } from '../data/finance';
import { ACCENTS, ACCENT_SWATCH, usePageTheme } from '../lib/theme';
import { changeLocale, type Locale } from '../i18n';
import { areHapticsEnabled, setHapticsEnabled } from '../lib/haptics';
import { apiFetch } from '../lib/api';

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { role, user, signOut, exitGuest, deleteAccount, accent, setAccent, themeMode, setThemeMode, updateGuestSettings, patchUser } = useAuth();
  const { health, finance, plan } = useFinance();
  const [sheet, setSheet] = useState<'health' | 'money' | 'danger' | null>(null);
  const [haptics, setHaptics] = useState(areHapticsEnabled());
  const [busy, setBusy] = useState(false);
  usePageTheme('profile', accent);

  const isGuest = role === 'guest';
  const name = isGuest ? t('guest.title') : (user?.displayName ?? user?.email ?? '—');
  const completeness = (() => {
    let filled = 0;
    const total = 5;
    if (health.age) filled += 1;
    if (health.weightKg) filled += 1;
    if (health.heightCm) filled += 1;
    if (health.conditions?.length || health.medications?.length) filled += 1;
    if (finance.incomes?.length) filled += 1;
    return Math.round((filled / total) * 100);
  })();

  const saveLocale = async (locale: Locale) => {
    await changeLocale(locale);
    if (isGuest) await updateGuestSettings({ locale });
    else await patchUser({ locale });
  };

  const toggleTheme = async () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    if (!isGuest) await patchUser({ theme: next });
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
    } catch {
      show(t('errors.generic'), 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-3 pb-4">
      <PageHeader title={t('nav.profile')} />

      <div className="surface-card flex items-center gap-3 p-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-[22px] font-black text-white"
          style={{ background: 'linear-gradient(140deg, var(--hero-grad-a), var(--hero-grad-b))' }}
        >
          {user && 'photoURL' in user && user.photoURL ? (
            <img src={String(user.photoURL)} alt="" className="h-full w-full object-cover" />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold">{name}</p>
          <p className="truncate text-[11px] text-muted">{isGuest ? t('guest.localOnly') : user?.email}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={completeness > 60 ? 'ok' : 'warn'}>{t('profile2.completeness', { value: completeness })}</Badge>
            {plan ? <Badge tone="neutral">{t(`accountant.level.${plan.level}`)}</Badge> : null}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <button type="button" onClick={() => setSheet('health')} className="flex w-full min-h-[52px] items-center justify-between px-3 text-start">
          <span className="text-[13px] font-semibold">{t('profile2.health')}</span>
          <span className="flex items-center gap-1 text-[11px] text-muted">
            {completeness}% <ChevronRight className="flip-rtl h-4 w-4" aria-hidden />
          </span>
        </button>
        <div className="h-px bg-line" />
        <button type="button" onClick={() => setSheet('money')} className="flex w-full min-h-[52px] items-center justify-between px-3 text-start">
          <span className="text-[13px] font-semibold">{t('profile2.money')}</span>
          <span className="flex items-center gap-1 text-[11px] text-muted">
            {t(`accountant.level.${finance.level}`)} <ChevronRight className="flip-rtl h-4 w-4" aria-hidden />
          </span>
        </button>
      </div>

      <div>
        <SectionHeader title={t('profile2.appearance')} />
        <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">{t('profile2.accent')}</p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={value}
                  aria-pressed={accent === value}
                  onClick={() => setAccent(value)}
                  className={cn('h-9 w-9 rounded-full border-2 transition-transform active:scale-95', accent === value ? 'border-fg' : 'border-transparent')}
                  style={{ background: ACCENT_SWATCH[value] }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold">{t('profile.language')}</span>
            <div className="flex gap-1.5">
              {SUPPORTED_LOCALES.map((locale: Locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => void saveLocale(locale)}
                  aria-pressed={i18n.language === locale}
                  className={cn(
                    'min-h-[34px] rounded-full px-2.5 text-[11px] font-bold',
                    i18n.language === locale ? 'bg-accent text-accent-fg' : 'bg-surface2 text-muted',
                  )}
                >
                  {LOCALE_LABEL[locale]}
                </button>
              ))}
            </div>
          </div>

          <Switch label={t('profile.darkMode')} checked={themeMode === 'dark'} onChange={() => void toggleTheme()} />
          <Switch
            label={t('profile2.haptics')}
            description={t('profile2.hapticsHint')}
            checked={haptics}
            onChange={(value) => {
              setHaptics(value);
              setHapticsEnabled(value);
            }}
          />
        </div>
      </div>

      <div>
        <SectionHeader title={t('profile2.privacy')} />
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          <Link to="/legal/privacy" className="flex min-h-[50px] items-center justify-between px-3 text-[13px] font-semibold">
            {t('profile.privacy')} <ChevronRight className="flip-rtl h-4 w-4 text-muted" aria-hidden />
          </Link>
          <Link to="/legal/terms" className="flex min-h-[50px] items-center justify-between px-3 text-[13px] font-semibold">
            {t('profile.terms')} <ChevronRight className="flip-rtl h-4 w-4 text-muted" aria-hidden />
          </Link>
          <button type="button" onClick={() => void exportData()} className="flex w-full min-h-[50px] items-center justify-between px-3 text-[13px] font-semibold">
            {t('profile.export')} <Download className="h-4 w-4 text-muted" aria-hidden />
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-danger/40 bg-dangerSoft p-3">
        <SectionHeader title={t('profile2.dangerZone')} />
        {isGuest ? (
          <Button
            variant="danger"
            fullWidth
            icon={<UserX className="h-4 w-4" aria-hidden />}
            onClick={async () => {
              if (!window.confirm(t('guest.exitBody'))) return;
              await exitGuest();
              navigate('/login');
            }}
          >
            {t('guest.exitConfirm')}
          </Button>
        ) : (
          <Button variant="danger" fullWidth icon={<Trash2 className="h-4 w-4" aria-hidden />} onClick={() => setSheet('danger')}>
            {t('profile.deleteAccount')}
          </Button>
        )}
        <Button
          variant="secondary"
          fullWidth
          icon={<LogOut className="h-4 w-4" aria-hidden />}
          onClick={() => void (isGuest ? exitGuest() : signOut())}
        >
          {isGuest ? t('guest.exitTitle') : t('auth.signOut')}
        </Button>
      </div>

      <p className="text-center text-[10px] text-muted">
        {t('profile2.version')} {import.meta.env.VITE_APP_VERSION ?? '1.0.0'} · {t('app.name')}
      </p>

      <Sheet open={sheet === 'health'} title={t('profile2.health')} onClose={() => setSheet(null)} size="tall">
        <HealthForm initial={health} onSaved={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'money'} title={t('profile2.money')} onClose={() => setSheet(null)} size="tall">
        <FinanceForm initial={finance} onSaved={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'danger'} title={t('profile.deleteAccount')} onClose={() => setSheet(null)}>
        <p className="text-[13px] text-danger">{t('profile.deleteWarning')}</p>
        <Button
          variant="danger"
          fullWidth
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await deleteAccount();
              navigate('/login');
            } catch {
              show(t('errors.generic'), 'danger');
            } finally {
              setBusy(false);
            }
          }}
        >
          {t('profile.deleteConfirm')}
        </Button>
      </Sheet>

    </div>
  );
}
