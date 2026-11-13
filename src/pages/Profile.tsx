/**
 * Baraka v2 — Profile, Financial Setup & Advanced Customization Suite
 * Comprehensive preferences desk:
 * - Top sticky section sub-navigation: الصحة (Health), المال (Finance), التفضيلات (Preferences), الخطر (Danger zone).
 * - Identity Hero with stepped completion metric (0-100%).
 * - Health profile management with tag-based conditions & medications, regular font numbers.
 * - Financial profile management, searchable 8-currency selector, fiqh madhhab selection.
 * - AI Engine control: Ultra-fast built-in (Gemini 2.5 Flash Lite) vs BYOK private key.
 * - Appearance: System/Dark/Light theme, 4 Harmonized Palettes, Interface Language.
 * - Reduced motion & storage maintenance.
 * - Danger zone: JSON export, cache purge, sign out, account termination.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Coins,
  Cpu,
  Download,
  FileText,
  Heart,
  Key,
  LogOut,
  RefreshCw,
  Scale,
  Shield,
  Wallet,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { LOCALE_LABEL, SUPPORTED_CURRENCIES, SUPPORTED_LOCALES } from '../../shared/constants';
import type { AiMode, Locale, Madhhab } from '../../shared/types';
import { PageHeader } from '../components/AppShell';
import { HealthForm } from '../components/HealthForm';
import { FinanceForm } from '../components/FinanceForm';
import { Button } from '../components/ui/Button';
import { StatusBadge, Progress } from '../components/ui/Feedback';
import { Sheet } from '../components/ui/Sheet';
import { Switch, ThemeSelector } from '../components/ui/Controls';
import { Input } from '../components/ui/Field';
import { cn } from '../components/ui';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { useFinance } from '../data/finance';
import { ACCENTS, ACCENT_SWATCH, usePageTheme } from '../lib/theme';
import { changeLocale } from '../i18n';
import { CacheKeys, idbGet, idbSet } from '../lib/idb';
import { apiFetch } from '../lib/api';
import { haptic, HAPTIC } from '../lib/haptics';

const CURRENCY_CONFIG: Record<string, { label: string; symbol: string; flag: string }> = {
  RUB: { label: 'روبل روسي', symbol: '₽', flag: '🇷🇺' },
  SAR: { label: 'ريال سعودي', symbol: 'ر.س', flag: '🇸🇦' },
  AED: { label: 'درهم إماراتي', symbol: 'د.إ', flag: '🇦🇪' },
  USD: { label: 'دولار أمريكي', symbol: '$', flag: '🇺🇸' },
  EUR: { label: 'يورو أوروبي', symbol: '€', flag: '🇪🇺' },
  KZT: { label: 'تينغ كازاخستاني', symbol: '₸', flag: '🇰🇿' },
  TRY: { label: 'ليرة تركية', symbol: '₺', flag: '🇹🇷' },
  GBP: { label: 'جنيه إسترليني', symbol: '£', flag: '🇬🇧' },
};

const MADHHAB_CONFIG: { id: Madhhab; label: string; desc: string }[] = [
  { id: 'none', label: 'عام / مذهب الجمهور', desc: 'الاعتماد على القواعد المجمع عليها والأحوط شرعاً' },
  { id: 'hanafi', label: 'المذهب الحنفي', desc: 'تدقيق خاص في مشتقات الحيوانات والذبائح والمأكولات البحرية' },
  { id: 'shafii', label: 'المذهب الشافعي', desc: 'اشتراط التذكية الشرعية الصارمة وطهارة الأعيان' },
  { id: 'maliki', label: 'المذهب المالكي', desc: 'ضوابط الاستحالة وتوسيع المأكولات البحرية والمصالح' },
  { id: 'hanbali', label: 'المذهب الحنبلي', desc: 'التحري والورع والالتزام بالنصوص والآثار' },
];

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
  const [busy, setBusy] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  // Advanced Customizations State
  const activeCurrency = (role === 'guest' ? finance.currency : user?.currency) || 'RUB';
  const activeMadhhab: Madhhab = user?.madhhab ?? 'none';
  const activeAiMode: AiMode = user?.aiMode ?? 'builtin';

  const [showAiCustom, setShowAiCustom] = useState(false);
  const [ownKey, setOwnKey] = useState({ baseUrl: '', apiKey: '', model: '' });
  const [savingKey, setSavingKey] = useState(false);

  const [reducedMotion, setReducedMotion] = useState(() => {
    try {
      return localStorage.getItem('baraka.reducedMotion') === '1';
    } catch {
      return false;
    }
  });

  usePageTheme('profile', accent);

  const isGuest = role === 'guest';
  const name = isGuest ? t('guest.title') : (user?.displayName ?? user?.email ?? '—');

  // Load stored BYOK configuration if present
  useEffect(() => {
    void (async () => {
      const stored = await idbGet<{ baseUrl: string; apiKey: string; model: string }>(CacheKeys.ownKey);
      if (stored) setOwnKey(stored);
    })();
  }, []);

  // Filter currencies based on search query
  const filteredCurrencies = useMemo(() => {
    const q = currencySearch.trim().toLowerCase();
    if (!q) return SUPPORTED_CURRENCIES;
    return SUPPORTED_CURRENCIES.filter((curr) => {
      const conf = CURRENCY_CONFIG[curr];
      return (
        curr.toLowerCase().includes(q) ||
        (conf && conf.label.toLowerCase().includes(q)) ||
        (conf && conf.symbol.toLowerCase().includes(q))
      );
    });
  }, [currencySearch]);

  // Profile Completeness Checklist
  const steps = useMemo(() => {
    return [
      { id: 'age', label: 'العمر والوزن', done: Boolean(health.age && health.weightKg) },
      { id: 'healthConditions', label: 'الحالات الصحية', done: Boolean(health.conditions?.length || health.medications?.length) },
      { id: 'currency', label: 'عملة الحساب', done: Boolean(user?.currency || finance.currency) },
      { id: 'income', label: 'الدخل الشهري', done: Boolean(finance.incomes?.length) },
      { id: 'madhhab', label: 'المذهب الفقهي', done: Boolean(user?.madhhab && user.madhhab !== 'none') },
    ];
  }, [finance.currency, finance.incomes, health.age, health.conditions, health.medications, health.weightKg, user?.currency, user?.madhhab]);

  const completedSteps = steps.filter((s) => s.done).length;
  const completeness = Math.round((completedSteps / steps.length) * 100);

  const saveLocale = async (newLocale: Locale) => {
    try {
      await changeLocale(newLocale);
      if (!isGuest) {
        await patchUser({ locale: newLocale });
      }
      haptic(HAPTIC.tap);
      show(t('common.saved', 'تم تحديث اللغة'), 'info');
    } catch {
      show(t('errors.generic'), 'danger');
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    try {
      if (isGuest) {
        await updateGuestSettings({ currency: newCurrency });
      } else {
        await patchUser({ currency: newCurrency });
      }
      haptic(HAPTIC.tap);
      show(`تم اعتماد عملة ${newCurrency}`, 'info');
    } catch {
      show(t('errors.generic'), 'danger');
    }
  };

  const handleMadhhabChange = async (madhhab: Madhhab) => {
    try {
      if (isGuest) {
        await updateGuestSettings({ madhhab });
      } else {
        await patchUser({ madhhab });
      }
      haptic(HAPTIC.tap);
      show(t('common.saved', 'تم تحديث المذهب الفقهي'), 'info');
    } catch {
      show(t('errors.generic'), 'danger');
    }
  };

  const handleAiModeToggle = async (mode: AiMode) => {
    try {
      if (!isGuest) {
        await patchUser({ aiMode: mode });
      }
      if (mode === 'own') setShowAiCustom(true);
      haptic(HAPTIC.tap);
      show(mode === 'builtin' ? 'تم تفعيل الذكاء المدمج فائق السرعة' : 'تم تفعيل وضع المفتاح الخاص', 'info');
    } catch {
      show(t('errors.generic'), 'danger');
    }
  };

  const saveOwnKeyConfig = async () => {
    setSavingKey(true);
    try {
      await idbSet(CacheKeys.ownKey, ownKey);
      if (!isGuest) {
        await patchUser({ aiMode: 'own' });
      }
      haptic(HAPTIC.tap);
      show('تم حفظ مفتاح الذكاء الاصطناعي محلياً على هذا الجهاز بنجاح', 'info');
      setShowAiCustom(false);
    } catch {
      show(t('errors.generic'), 'danger');
    } finally {
      setSavingKey(false);
    }
  };

  const toggleReducedMotion = (enabled: boolean) => {
    setReducedMotion(enabled);
    try {
      localStorage.setItem('baraka.reducedMotion', enabled ? '1' : '0');
      document.documentElement.classList.toggle('reduce-motion', enabled);
    } catch {
      // ignore
    }
    haptic(HAPTIC.tap);
    show(enabled ? 'تم تفعيل تقليل الحركة' : 'تم تفعيل الحركة السلسة', 'info');
  };

  const clearAppCache = async () => {
    setBusy(true);
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
      haptic(HAPTIC.tap);
      show('تم تفريغ الذاكرة المؤقتة وتنظيف التخزين', 'info');
    } catch {
      show('تم تنظيف الذاكرة بنجاح', 'info');
    } finally {
      setBusy(false);
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
      show('تم تنزيل ملف بياناتك بنجاح', 'info');
    } catch {
      show(t('errors.generic'), 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 pb-12">
      <PageHeader
        title={t('nav.profile', 'حسابي')}
        subtitle="إدارة الملف الصحي والمالي وضبط التفضيلات ومحرك الذكاء"
      />

      {/* ===================================================================
          STICKY SUB-NAVIGATION TABS
          =================================================================== */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-bg/90 backdrop-blur-md border-b border-line flex items-center gap-2 overflow-x-auto">
        <a
          href="#health"
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface border border-line hover:border-accent hover:text-accent text-fg transition-colors whitespace-nowrap shadow-xs"
        >
          {t('onboarding.healthTitle', 'الصحة')}
        </a>
        <a
          href="#finance"
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface border border-line hover:border-accent hover:text-accent text-fg transition-colors whitespace-nowrap shadow-xs"
        >
          {t('onboarding.financeTitle', 'المال')}
        </a>
        <a
          href="#preferences"
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface border border-line hover:border-accent hover:text-accent text-fg transition-colors whitespace-nowrap shadow-xs"
        >
          {t('profile.preferences', 'التفضيلات')}
        </a>
        <a
          href="#danger"
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface border border-line hover:border-danger hover:text-danger text-muted transition-colors whitespace-nowrap shadow-xs"
        >
          {t('profile.dangerZone', 'الخطر')}
        </a>
      </div>

      {/* ===================================================================
          1. IDENTITY & PROFILE COMPLETION HERO CARD
          =================================================================== */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-accent-fg font-display text-lg font-bold shadow-xs">
            {user && 'photoURL' in user && user.photoURL ? (
              <img src={String(user.photoURL)} alt="" className="h-full w-full object-cover" />
            ) : (
              name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate font-display text-base font-bold text-fg">{name}</p>
            <p className="truncate text-xs text-muted">
              {isGuest ? t('guest.localOnly') : user?.email}
            </p>
            <div className="pt-1 flex items-center gap-2">
              <StatusBadge tone={completeness >= 80 ? 'ok' : 'warn'}>
                {completeness}% مكتمل
              </StatusBadge>
              {plan ? <StatusBadge tone="neutral">{t(`accountant.level.${plan.level}`)}</StatusBadge> : null}
            </div>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-muted">
            <span>اكتمال الملف الصحي والمالي</span>
            <span className="font-sans font-bold text-fg">{completedSteps} من {steps.length} خطوات</span>
          </div>
          <Progress value={completeness} tone={completeness >= 80 ? 'ok' : 'accent'} />
        </div>
      </div>

      {/* ===================================================================
          SECTION 1: HEALTH (#health)
          =================================================================== */}
      <section id="health" className="space-y-3 scroll-mt-14">
        <div className="surface-card p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Heart className="h-5 w-5 text-accent" />
              <div>
                <h3 className="font-display text-sm font-bold text-fg">{t('profile2.health', 'الملف الصحي')}</h3>
                <p className="text-xs text-muted">العمر، الوزن، الطول، الأمراض المزمنة، والأدوية الحالية</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setSheet('health')}>
              {t('common.edit', 'تعديل')}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border border-line bg-surface2/40">
              <span className="text-muted block text-[11px]">العمر</span>
              <span className="font-sans font-bold text-fg">{health.age ? `${health.age} سنة` : '—'}</span>
            </div>
            <div className="p-2.5 rounded-xl border border-line bg-surface2/40">
              <span className="text-muted block text-[11px]">الوزن والطول</span>
              <span className="font-sans font-bold text-fg">
                {health.weightKg ? `${health.weightKg} كغ` : '—'} / {health.heightCm ? `${health.heightCm} سم` : '—'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl border border-line bg-surface2/40 col-span-2">
              <span className="text-muted block text-[11px]">الأمراض المزمنة والأدوية</span>
              <span className="font-sans font-bold text-fg truncate block">
                {[...(health.conditions ?? []), ...(health.medications ?? [])].join('، ') || 'لا توجد أدوية أو حالات مسجلة'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          SECTION 2: FINANCE (#finance)
          =================================================================== */}
      <section id="finance" className="space-y-4 scroll-mt-14">
        {/* Financial Profile Card */}
        <div className="surface-card p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Wallet className="h-5 w-5 text-accent" />
              <div>
                <h3 className="font-display text-sm font-bold text-fg">{t('profile2.money', 'الملف المالي')}</h3>
                <p className="text-xs text-muted">مصادر الدخل، يوم الراتب، والالتزامات الثابتة</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setSheet('money')}>
              {t('common.edit', 'تعديل')}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border border-line bg-surface2/40">
              <span className="text-muted block text-[11px]">مصادر الدخل المسجلة</span>
              <span className="font-sans font-bold text-fg">{finance.incomes?.length ?? 0} مصادر</span>
            </div>
            <div className="p-2.5 rounded-xl border border-line bg-surface2/40">
              <span className="text-muted block text-[11px]">الالتزامات الثابتة</span>
              <span className="font-sans font-bold text-fg">{finance.fixedExpenses?.length ?? 0} التزامات</span>
            </div>
            <div className="p-2.5 rounded-xl border border-line bg-surface2/40 col-span-2 sm:col-span-1">
              <span className="text-muted block text-[11px]">نمط الميزانية</span>
              <span className="font-sans font-bold text-fg capitalize">{t(`accountant.level.${finance.level}`)}</span>
            </div>
          </div>
        </div>

        {/* Searchable Multi-Currency Selector */}
        <div className="surface-card p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Coins className="h-5 w-5 text-accent" />
              <div>
                <h3 className="font-display text-sm font-bold text-fg">عملة الحساب والمحاسب</h3>
                <p className="text-xs text-muted">العملة الأساسية لحساب الميزانية وسقف الصرف اليومي</p>
              </div>
            </div>
            <StatusBadge tone="ok">{activeCurrency}</StatusBadge>
          </div>

          {/* Search Field */}
          <div className="w-full">
            <Input
              label="بحث عن عملة..."
              value={currencySearch}
              onChange={(e) => setCurrencySearch(e.target.value)}
              suffix={<Search className="h-4 w-4 text-muted" />}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {filteredCurrencies.map((curr) => {
              const active = activeCurrency === curr;
              const details = CURRENCY_CONFIG[curr] ?? { label: curr, symbol: curr, flag: '🌐' };
              return (
                <button
                  key={curr}
                  type="button"
                  onClick={() => void handleCurrencyChange(curr)}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-start',
                    active
                      ? 'border-accent bg-accent-soft/50 shadow-xs ring-1 ring-accent'
                      : 'border-line bg-surface2 hover:bg-surface2/80',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{details.flag}</span>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-fg block truncate">{curr}</span>
                      <span className="text-[10px] text-muted block truncate">{details.label}</span>
                    </div>
                  </div>
                  <span className="font-sans text-xs font-bold text-accent shrink-0 ms-1">
                    {details.symbol}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Islamic Jurisprudence & Madhhab Selection */}
        <div className="surface-card p-5 space-y-3.5">
          <div className="flex items-center gap-2.5 border-b border-line/60 pb-3">
            <Scale className="h-5 w-5 text-accent" />
            <div>
              <h3 className="font-display text-sm font-bold text-fg">المذهب الفقهي المعتمد في الفحص</h3>
              <p className="text-xs text-muted">
                يُراعي مساعد الحلال ضوابط مذهبك الفقهي في أحكام الذبائح والمنفحة والجيلاتين
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MADHHAB_CONFIG.map(({ id, label, desc }) => {
              const active = activeMadhhab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => void handleMadhhabChange(id)}
                  className={cn(
                    'flex flex-col items-start p-3 rounded-xl border text-start transition-all cursor-pointer',
                    active
                      ? 'border-accent bg-accent-soft/40 shadow-xs ring-1 ring-accent'
                      : 'border-line bg-surface2 hover:bg-surface2/80',
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-display text-xs font-bold text-fg">{label}</span>
                    {active ? (
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================================================================
          SECTION 3: PREFERENCES (#preferences)
          =================================================================== */}
      <section id="preferences" className="space-y-4 scroll-mt-14">
        {/* AI Engine & Privacy */}
        <div className="surface-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Cpu className="h-5 w-5 text-accent" />
              <div>
                <h3 className="font-display text-sm font-bold text-fg">محرك الذكاء الاصطناعي والخصوصية</h3>
                <p className="text-xs text-muted">التحكم في خادم الاستجابة ومستوى أمان البيانات</p>
              </div>
            </div>
            <StatusBadge tone={activeAiMode === 'builtin' ? 'ok' : 'accent'}>
              {activeAiMode === 'builtin' ? 'سحابي فائق السرعة' : 'مفتاح خاص (BYOK)'}
            </StatusBadge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => void handleAiModeToggle('builtin')}
              className={cn(
                'flex flex-col items-start p-3.5 rounded-xl border text-start transition-all cursor-pointer',
                activeAiMode === 'builtin'
                  ? 'border-accent bg-accent-soft/40 shadow-xs ring-1 ring-accent'
                  : 'border-line bg-surface2 hover:bg-surface2/80',
              )}
            >
              <span className="font-display text-xs font-bold text-fg block mb-1">
                الذكاء المدمج السحابي (Gemini 2.5 Flash Lite)
              </span>
              <p className="text-[11px] text-muted leading-relaxed">
                محرك سحابي مجاني عالي السرعة (استجابة فورية) مهيأ للأحكام الشرعية والمحاسبية.
              </p>
            </button>

            <button
              type="button"
              onClick={() => void handleAiModeToggle('own')}
              className={cn(
                'flex flex-col items-start p-3.5 rounded-xl border text-start transition-all cursor-pointer',
                activeAiMode === 'own'
                  ? 'border-accent bg-accent-soft/40 shadow-xs ring-1 ring-accent'
                  : 'border-line bg-surface2 hover:bg-surface2/80',
              )}
            >
              <span className="font-display text-xs font-bold text-fg block mb-1">
                استخدام مفتاحي الخاص (BYOK)
              </span>
              <p className="text-[11px] text-muted leading-relaxed">
                ربط مفتاحك الخاص (OpenAI / Anthropic / OpenRouter / Ollama) مع حفظ المفتاح محلياً على جهازك فقط.
              </p>
            </button>
          </div>

          {/* BYOK Configuration Form */}
          {(activeAiMode === 'own' || showAiCustom) && (
            <div className="rounded-xl border border-line bg-surface2/60 p-4 space-y-3 pt-3">
              <div className="flex items-center gap-2 text-xs font-bold text-fg">
                <Key className="h-4 w-4 text-accent" />
                <span>إعدادات المفتاح الخاص (محفوظ محلياً فقط)</span>
              </div>

              <Input
                label="عنوان المزود (Base URL)"
                placeholder="https://api.openai.com/v1"
                value={ownKey.baseUrl}
                onChange={(e) => setOwnKey({ ...ownKey, baseUrl: e.target.value })}
              />
              <Input
                label="مفتاح API الخاص بك (API Key)"
                type="password"
                placeholder="sk-..."
                value={ownKey.apiKey}
                onChange={(e) => setOwnKey({ ...ownKey, apiKey: e.target.value })}
              />
              <Input
                label="اسم النموذج (Model Name)"
                placeholder="gpt-4o-mini أو claude-3-5-haiku"
                value={ownKey.model}
                onChange={(e) => setOwnKey({ ...ownKey, model: e.target.value })}
              />

              <Button
                variant="primary"
                size="md"
                fullWidth
                loading={savingKey}
                onClick={() => void saveOwnKeyConfig()}
              >
                حفظ المفتاح محلياً على هذا الجهاز
              </Button>
            </div>
          )}
        </div>

        {/* Appearance & Theme Palettes */}
        <div className="surface-card p-5 space-y-4">
          <p className="font-display text-sm font-bold text-fg">{t('profile2.appearance', 'المظهر والألوان')}</p>

          {/* Theme Selector */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-muted block">{t('profile.theme', 'المظهر')}</span>
            <ThemeSelector
              value={themeMode}
              onChange={(mode) => {
                setThemeMode(mode);
                if (!isGuest) void patchUser({ theme: mode });
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
            <span className="text-xs font-bold text-muted block">{t('profile2.accent', 'اللون المميز')}</span>
            <div className="grid grid-cols-4 gap-2.5">
              {ACCENTS.map((item) => {
                const active = accent === item;
                const swatch = isGuest
                  ? ACCENT_SWATCH[item].dark
                  : ACCENT_SWATCH[item][themeMode === 'light' ? 'light' : 'dark'];
                return (
                  <button
                    key={item}
                    type="button"
                    aria-label={item}
                    onClick={() => setAccent(item)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer',
                      active
                        ? 'border-accent bg-accent-soft shadow-xs'
                        : 'border-line bg-surface2 hover:bg-surface2/80',
                    )}
                  >
                    <span
                      className="h-6 w-6 rounded-full border border-black/10 shadow-xs"
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
            <span className="text-xs font-bold text-muted block">{t('profile.language', 'اللغة')}</span>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_LOCALES.map((loc: Locale) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => void saveLocale(loc)}
                  className={cn(
                    'min-h-[40px] rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer',
                    i18n.language === loc
                      ? 'border-accent bg-accent text-accent-fg shadow-xs'
                      : 'border-line bg-surface2 text-muted hover:text-fg',
                  )}
                >
                  {LOCALE_LABEL[loc]}
                </button>
              ))}
            </div>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="pt-2 border-t border-line/60">
            <Switch
              label="تقليل الحركة وسلاسة الأداء"
              description="إلغاء المؤثرات الحركية المعقدة لسرعة فائقة وتوفير البطارية"
              checked={reducedMotion}
              onChange={toggleReducedMotion}
            />
          </div>
        </div>
      </section>

      {/* ===================================================================
          SECTION 4: DANGER ZONE (#danger)
          =================================================================== */}
      <section id="danger" className="space-y-4 scroll-mt-14">
        <div className="surface-card overflow-hidden divide-y divide-line/60">
          <button
            type="button"
            onClick={() => void clearAppCache()}
            className="flex w-full min-h-[52px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors text-sm font-bold text-fg cursor-pointer text-start"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 text-muted" />
              <div>
                <span>تفريغ الذاكرة المؤقتة (Cache)</span>
                <span className="text-[11px] text-muted block font-normal">
                  تسريع المتصفح وتنظيف الصور والبيانات المؤقتة
                </span>
              </div>
            </div>
            <span className="text-xs text-muted">تنظيف</span>
          </button>

          <button
            type="button"
            onClick={() => void exportData()}
            className="flex w-full min-h-[52px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors text-sm font-bold text-fg cursor-pointer text-start"
          >
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-muted" />
              <div>
                <span>{t('profile.export', 'تصدير البيانات')}</span>
                <span className="text-[11px] text-muted block font-normal">
                  تنزيل نسخة احتياطية من محادثاتك وسجلاتك
                </span>
              </div>
            </div>
            <span className="text-xs text-muted">JSON</span>
          </button>

          <Link
            to="/legal/privacy"
            className="flex min-h-[52px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors text-sm font-bold text-fg"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted" />
              <span>{t('profile.privacy', 'سياسة الخصوصية')}</span>
            </div>
            <ChevronRight className="flip-rtl h-4 w-4 text-muted" aria-hidden />
          </Link>

          <Link
            to="/legal/terms"
            className="flex min-h-[52px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors text-sm font-bold text-fg"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted" />
              <span>{t('profile.terms', 'شروط الاستخدام')}</span>
            </div>
            <ChevronRight className="flip-rtl h-4 w-4 text-muted" aria-hidden />
          </Link>
        </div>

        {/* Sign Out Button */}
        <div className="surface-card p-4">
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            icon={<LogOut className="h-4 w-4" />}
            onClick={() => void (isGuest ? exitGuest() : signOut())}
          >
            {isGuest ? t('guest.exitTitle', 'الخروج من وضع الضيف') : t('auth.signOut', 'تسجيل الخروج')}
          </Button>
        </div>

        {/* Account Deletion Trigger */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              setDeleteInput('');
              setSheet('danger');
            }}
            className="text-xs font-semibold text-danger/80 hover:text-danger hover:underline cursor-pointer transition-colors"
          >
            {t('profile.deleteAccount', 'حذف الحساب نهائياً')}
          </button>
        </div>
      </section>

      {/* ===================================================================
          SHEETS
          =================================================================== */}
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
              لتأكيد الحذف، اكتب كلمة <span className="text-danger font-extrabold font-sans">حذف</span> أدناه:
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
            {t('profile.deleteConfirm', 'تأكيد حذف الحساب')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
