/**
 * Baraka v2 — Profile & Preferences Desk
 * Account status, Health & Financial setup, Appearance (3-state theme & 4 verified palettes),
 * Language, Data Export, and Quiet Destructive Account Deletion.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Download,
  LogOut,
  Shield,
  FileText,
  Heart,
  Wallet,
} from 'lucide-react';
import { LOCALE_LABEL, SUPPORTED_LOCALES } from '../../shared/constants';
import { PageHeader } from '../components/AppShell';
import { HealthForm } from '../components/HealthForm';
import { FinanceForm } from '../components/FinanceForm';
import { Button } from '../components/ui/Button';
import { Badge, Progress } from '../components/ui/Feedback';
import { Sheet } from '../components/ui/Sheet';
import { Switch, ThemeSelector } from '../components/ui/Controls';
import { Input } from '../components/ui/Field';
import { cn } from '../components/ui';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { useFinance } from '../data/finance';
import { ACCENTS, ACCENT_SWATCH, usePageTheme } from '../lib/theme';
import { changeLocale, type Locale } from '../i18n';
import { areHapticsEnabled, setHapticsEnabled, haptic, HAPTIC } from '../lib/haptics';
import { apiFetch } from '../lib/api';

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
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
  const { health, finance, plan } = useFinance();
  const [sheet, setSheet] = useState<'health' | 'money' | 'danger' | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [haptics, setHaptics] = useState(areHapticsEnabled());
  const [busy, setBusy] = useState(false);
  usePageTheme('profile', accent);

  const isGuest = role === 'guest';
  const name = isGuest ? t('guest.title') : (user?.displayName ?? user?.email ?? '—');

  // Profile completion stepped metric (0 to 100%)
  const steps = [
    { label: 'العمر', done: Boolean(health.age) },
    { label: 'الوزن والطول', done: Boolean(health.weightKg && health.heightCm) },
    { label: 'الحالات الصحية', done: Boolean(health.conditions?.length || health.medications?.length) },
    { label: 'الدخل الشهري', done: Boolean(finance.incomes?.length) },
    { label: 'نمط الميزانية', done: Boolean(finance.level) },
  ];
  const completedSteps = steps.filter((s) => s.done).length;
  const completeness = Math.round((completedSteps / steps.length) * 100);

  const saveLocale = async (locale: Locale) => {
    await changeLocale(locale);
    if (isGuest) await updateGuestSettings({ locale });
    else await patchUser({ locale });
    haptic(HAPTIC.select);
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
      show('تم تنزيل ملف بياناتك بنجاح', 'success');
    } catch {
      show(t('errors.generic'), 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 pb-8">
      <PageHeader title={t('nav.profile')} />

      {/* 1. IDENTITY & PROFILE COMPLETION HERO CARD */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-accent-fg font-display text-xl font-bold shadow-e1">
            {user && 'photoURL' in user && user.photoURL ? (
              <img src={String(user.photoURL)} alt="" className="h-full w-full object-cover" />
            ) : (
              name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate font-display text-base sm:text-lg font-bold text-fg">{name}</p>
            <p className="truncate text-xs text-muted font-medium">
              {isGuest ? t('guest.localOnly') : user?.email}
            </p>
            <div className="pt-1 flex items-center gap-2">
              <Badge tone={completeness >= 80 ? 'ok' : 'warn'}>
                {completeness}% مكتمل
              </Badge>
              {plan ? <Badge tone="neutral">{t(`accountant.level.${plan.level}`)}</Badge> : null}
            </div>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-muted">
            <span>اكتمال الملف الصحي والمالي</span>
            <span className="num font-bold text-fg">{completedSteps} من {steps.length} خطوات</span>
          </div>
          <Progress value={completeness} tone={completeness >= 80 ? 'ok' : 'accent'} />
        </div>
      </div>

      {/* 2. HEALTH & FINANCIAL PROFILE DRAWERS */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-e1 divide-y divide-line/60">
        <button
          type="button"
          onClick={() => setSheet('health')}
          className="flex w-full min-h-[56px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors cursor-pointer text-start"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface2 text-accent">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-sm font-bold text-fg block">{t('profile2.health')}</span>
              <span className="text-xs text-muted">الطول، الوزن، الحالات المزمنة والأدوية</span>
            </div>
          </div>
          <ChevronRight className="flip-rtl h-4 w-4 text-muted shrink-0" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => setSheet('money')}
          className="flex w-full min-h-[56px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors cursor-pointer text-start"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface2 text-accent">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-sm font-bold text-fg block">{t('profile2.money')}</span>
              <span className="text-xs text-muted">الدخل الشهري، يوم الراتب ونمط الادخار</span>
            </div>
          </div>
          <ChevronRight className="flip-rtl h-4 w-4 text-muted shrink-0" aria-hidden />
        </button>
      </div>

      {/* 3. APPEARANCE & PREFERENCES */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 space-y-4">
        <p className="font-display text-sm font-bold text-fg">{t('profile2.appearance')}</p>

        {/* 3-State Theme Selector (System / Light / Dark) */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-muted uppercase tracking-wide block">
            {t('profile.theme')}
          </span>
          <ThemeSelector
            value={themeMode}
            onChange={(mode) => {
              setThemeMode(mode);
              if (!isGuest) void patchUser({ theme: mode });
              haptic(HAPTIC.select);
            }}
            labels={{
              system: t('theme.system'),
              light: t('theme.light'),
              dark: t('theme.dark'),
            }}
          />
        </div>

        {/* 4 Harmonized Accent Palettes */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-bold text-muted uppercase tracking-wide block">
            {t('profile2.accent')}
          </span>
          <div className="grid grid-cols-4 gap-2.5">
            {ACCENTS.map((item) => {
              const active = accent === item;
              const swatch = isGuest ? ACCENT_SWATCH[item].dark : ACCENT_SWATCH[item][themeMode === 'light' ? 'light' : 'dark'];
              return (
                <button
                  key={item}
                  type="button"
                  aria-label={item}
                  onClick={() => {
                    setAccent(item);
                    haptic(HAPTIC.tap);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer',
                    active
                      ? 'border-accent bg-accent-soft shadow-sm'
                      : 'border-line bg-surface2 hover:bg-surface2/80',
                  )}
                >
                  <span
                    className="h-6 w-6 rounded-full border border-black/10 shadow-sm"
                    style={{ background: swatch }}
                  />
                  <span className="text-[11px] font-bold text-fg capitalize">{item}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interface Language */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-bold text-muted uppercase tracking-wide block">
            {t('profile.language')}
          </span>
          <div className="grid grid-cols-3 gap-2">
            {SUPPORTED_LOCALES.map((loc: Locale) => (
              <button
                key={loc}
                type="button"
                onClick={() => void saveLocale(loc)}
                className={cn(
                  'min-h-[40px] rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer',
                  i18n.language === loc
                    ? 'border-accent bg-accent text-accent-fg shadow-e1'
                    : 'border-line bg-surface2 text-muted hover:text-fg',
                )}
              >
                {LOCALE_LABEL[loc]}
              </button>
            ))}
          </div>
        </div>

        {/* Haptics Switch */}
        <div className="pt-2 border-t border-line/60">
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

      {/* 4. PRIVACY & DOCUMENTS */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-e1 divide-y divide-line/60">
        <Link
          to="/legal/privacy"
          className="flex min-h-[52px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors text-sm font-bold text-fg"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted" />
            <span>{t('profile.privacy')}</span>
          </div>
          <ChevronRight className="flip-rtl h-4 w-4 text-muted" aria-hidden />
        </Link>
        <Link
          to="/legal/terms"
          className="flex min-h-[52px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors text-sm font-bold text-fg"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted" />
            <span>{t('profile.terms')}</span>
          </div>
          <ChevronRight className="flip-rtl h-4 w-4 text-muted" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => void exportData()}
          className="flex w-full min-h-[52px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors text-sm font-bold text-fg cursor-pointer text-start"
        >
          <div className="flex items-center gap-3">
            <Download className="h-4 w-4 text-muted" />
            <span>{t('profile.export')}</span>
          </div>
          <span className="text-xs text-muted-soft">JSON</span>
        </button>
      </div>

      {/* 5. NORMAL ACCOUNT SIGN OUT (Not in Danger Zone!) */}
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
        <Button
          variant="secondary"
          fullWidth
          size="lg"
          icon={<LogOut className="h-4 w-4" />}
          onClick={() => void (isGuest ? exitGuest() : signOut())}
        >
          {isGuest ? t('guest.exitTitle') : t('auth.signOut')}
        </Button>
      </div>

      {/* 6. QUIET DESTRUCTIVE ACCOUNT ROW (Discreet, requires confirmation) */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => {
            setDeleteInput('');
            setSheet('danger');
          }}
          className="text-xs font-semibold text-danger/80 hover:text-danger hover:underline cursor-pointer transition-colors"
        >
          {t('profile.deleteAccount')}
        </button>
      </div>

      <p className="text-center text-xs text-muted-soft pt-1">
        بركة (Baraka) v1.0.0
      </p>

      {/* =====================================================================
          SHEETS & DIALOGS
          ===================================================================== */}
      <Sheet open={sheet === 'health'} title={t('profile2.health')} onClose={() => setSheet(null)} size="tall">
        <HealthForm initial={health} onSaved={() => setSheet(null)} />
      </Sheet>

      <Sheet open={sheet === 'money'} title={t('profile2.money')} onClose={() => setSheet(null)} size="tall">
        <FinanceForm initial={finance} onSaved={() => setSheet(null)} />
      </Sheet>

      {/* Delete Confirmation Sheet */}
      <Sheet open={sheet === 'danger'} title={t('profile.deleteAccount')} onClose={() => setSheet(null)}>
        <div className="space-y-4">
          <div className="rounded-xl border border-danger/30 bg-danger-soft/50 p-4 text-danger space-y-1">
            <p className="font-bold text-sm">تأكيد لا رجعة فيه</p>
            <p className="text-xs leading-relaxed text-fg">{t('profile.deleteWarning')}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted block">
              لتأكيد الحذف، اكتب كلمة <span className="text-danger font-extrabold font-mono">حذف</span> أدناه:
            </label>
            <Input
              label="تأكيد الحذف"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="اكتب: حذف"
            />
          </div>

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
        </div>
      </Sheet>
    </div>
  );
}
