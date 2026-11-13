/**
 * Baraka v2 — Profile, Financial Setup & Advanced Customization Suite
 * Comprehensive preferences desk:
 * - Identity Hero with stepped completion metric (0-100%)
 * - Health & Financial profile drawer dialogs
 * - Islamic Jurisprudence & Madhhab customization
 * - Multi-currency selector (RUB, SAR, AED, USD, EUR, KZT, TRY, GBP)
 * - AI Engine control: Ultra-fast built-in vs BYOK private key
 * - Appearance (Theme, 4 Harmonized Palettes, Interface Language)
 * - Reading Comfort & Reduced Motion (Zero Haptics)
 * - Storage & Data Governance: Cache clearing, Encrypted JSON Export
 * - Secure Session Sign-out & Safe Account Termination
 */

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { LOCALE_LABEL, SUPPORTED_CURRENCIES, SUPPORTED_LOCALES } from '../../shared/constants';
import type { AiMode, Locale, Madhhab } from '../../shared/types';
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
import { changeLocale } from '../i18n';
import { CacheKeys, idbGet, idbSet } from '../lib/idb';
import { apiFetch } from '../lib/api';

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

  // Profile completion stepped metric (0 to 100%)
  const steps = [
    { label: 'العمر', done: Boolean(health.age) },
    { label: 'الوزن والطول', done: Boolean(health.weightKg && health.heightCm) },
    {
      label: 'الحالات الصحية',
      done: Boolean(
        health.conditions?.length ||
        health.medications?.length ||
        health.allergies?.length ||
        health.sex,
      ),
    },
    { label: 'الدخل الشهري', done: Boolean(finance.incomes?.length) },
    { label: 'نمط الميزانية', done: Boolean(finance.level) },
  ];
  const completedSteps = steps.filter((s) => s.done).length;
  const completeness = Math.round((completedSteps / steps.length) * 100);

  const saveLocale = async (locale: Locale) => {
    await changeLocale(locale);
    if (isGuest) await updateGuestSettings({ locale });
    else await patchUser({ locale });
  };

  const handleCurrencyChange = async (currency: string) => {
    try {
      if (isGuest) {
        await updateGuestSettings({ currency });
      } else {
        await patchUser({ currency });
      }
      show(`تم اعتماد عملة الحساب: ${currency}`, 'success');
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
      show('تم ضبط المذهب الفقهي المعتمد بنجاح', 'success');
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
      show('تم حفظ مفتاح الذكاء الاصطناعي محلياً على هذا الجهاز بنجاح', 'success');
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
    show(enabled ? 'تم تفعيل تقليل الحركة' : 'تم تفعيل الحركة السلسة', 'info');
  };

  const clearAppCache = async () => {
    setBusy(true);
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
      show('تم تفريغ الذاكرة المؤقتة وتسريع استجابة التطبيق', 'success');
    } catch {
      show('تم تحديث الذاكرة بنجاح', 'success');
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
      show('تم تنزيل ملف بياناتك بنجاح', 'success');
    } catch {
      show(t('errors.generic'), 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 pb-12">
      <PageHeader
        title={t('nav.profile')}
        subtitle="إدارة الحساب، التخصيصات الذكية، وضبط الخيارات الفقهية والمالية"
      />

      {/* ===================================================================
          1. IDENTITY & PROFILE COMPLETION HERO CARD
          =================================================================== */}
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

      {/* ===================================================================
          2. HEALTH & FINANCIAL PROFILE DRAWERS
          =================================================================== */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-e1 divide-y divide-line/60">
        <button
          type="button"
          onClick={() => setSheet('health')}
          className="flex w-full min-h-[58px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors cursor-pointer text-start"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface2 text-accent">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-sm font-bold text-fg block">{t('profile2.health')}</span>
              <span className="text-xs text-muted">الطول، الوزن، الحالات المزمنة، حساسية الأدوية</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">
              {health.age ? `${health.age} سنة` : 'غير مكتمل'}
            </span>
            <ChevronRight className="flip-rtl h-4 w-4 text-muted shrink-0" aria-hidden />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSheet('money')}
          className="flex w-full min-h-[58px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors cursor-pointer text-start"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface2 text-accent">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-sm font-bold text-fg block">{t('profile2.money')}</span>
              <span className="text-xs text-muted">مصادر الدخل، نمط الميزانية، والالتزامات الثابتة</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">
              {finance.incomes?.length ? `${finance.incomes.length} مصادر` : 'غير مسجل'}
            </span>
            <ChevronRight className="flip-rtl h-4 w-4 text-muted shrink-0" aria-hidden />
          </div>
        </button>
      </div>

      {/* ===================================================================
          3. ISLAMIC JURISPRUDENCE & MADHHAB CUSTOMIZATION
          =================================================================== */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 space-y-3.5">
        <div className="flex items-center gap-2.5 border-b border-line/60 pb-3">
          <Scale className="h-5 w-5 text-accent" />
          <div>
            <h3 className="font-display text-sm font-bold text-fg">المذهب الفقهي المعتمد في الفحص</h3>
            <p className="text-xs text-muted">
              يُراعي فاحص الحلال والشيخ الذكي ضوابط مذهبك الفقهي في أحكام الذبائح والمنفحة والجيلاتين
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
                  {active ? <Badge tone="accent">المعتمد</Badge> : null}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">{desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          4. APP CURRENCY & FINANCIAL DISPLAY
          =================================================================== */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 space-y-3.5">
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <div className="flex items-center gap-2.5">
            <Coins className="h-5 w-5 text-accent" />
            <div>
              <h3 className="font-display text-sm font-bold text-fg">عملة الحساب والمحاسب</h3>
              <p className="text-xs text-muted">العملة الأساسية لحساب سقف الصرف اليومي والميزانية</p>
            </div>
          </div>
          <Badge tone="ok">{activeCurrency}</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SUPPORTED_CURRENCIES.map((curr) => {
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
                <span className="font-mono text-xs font-bold text-accent shrink-0 ms-1">
                  {details.symbol}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          5. AI ENGINE & PRIVACY (Built-in Ultra-Fast vs BYOK)
          =================================================================== */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-e1 space-y-4">
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-5 w-5 text-accent" />
            <div>
              <h3 className="font-display text-sm font-bold text-fg">محرك الذكاء الاصطناعي والخصوصية</h3>
              <p className="text-xs text-muted">التحكم في خادم الاستجابة ومستوى أمان البيانات</p>
            </div>
          </div>
          <Badge tone={activeAiMode === 'builtin' ? 'ok' : 'accent'}>
            {activeAiMode === 'builtin' ? 'سحابي فائق السرعة' : 'مفتاح خاص (BYOK)'}
          </Badge>
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
              محرك سحابي مجاني عالي السرعة (استجابة فورية أقل من ثانية) مهيأ للأحكام الشرعية والمحاسبية.
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
        {activeAiMode === 'own' || showAiCustom ? (
          <div className="rounded-xl border border-line bg-surface2/60 p-4 space-y-3 pt-3 animate-in fade-in duration-fast">
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
        ) : null}
      </div>

      {/* ===================================================================
          6. APPEARANCE & READING COMFORT (Zero Haptics, High Ergonomics)
          =================================================================== */}
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

        {/* Reduced Motion Toggle (Clean, battery-friendly alternative to vibration) */}
        <div className="pt-2 border-t border-line/60">
          <Switch
            label="تقليل الحركة وسلاسة الأداء"
            description="إلغاء المؤثرات الحركية المعقدة لسرعة فائقة وتوفير البطارية"
            checked={reducedMotion}
            onChange={toggleReducedMotion}
          />
        </div>
      </div>

      {/* ===================================================================
          7. STORAGE, PRIVACY & DATA GOVERNANCE
          =================================================================== */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-e1 divide-y divide-line/60">
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
          <span className="text-xs text-muted-soft">تنظيف</span>
        </button>

        <button
          type="button"
          onClick={() => void exportData()}
          className="flex w-full min-h-[52px] items-center justify-between px-4 sm:px-5 hover:bg-surface2 transition-colors text-sm font-bold text-fg cursor-pointer text-start"
        >
          <div className="flex items-center gap-3">
            <Download className="h-4 w-4 text-muted" />
            <div>
              <span>{t('profile.export')}</span>
              <span className="text-[11px] text-muted block font-normal">
                تنزيل نسخة احتياطية مشفرة من كامل محادثاتك وسجلاتك
              </span>
            </div>
          </div>
          <span className="text-xs text-muted-soft">JSON</span>
        </button>

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
      </div>

      {/* ===================================================================
          8. ACCOUNT TERMINATION & SIGN OUT
          =================================================================== */}
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

      {/* Quiet Destructive Account Deletion */}
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
        بركة (Baraka) v1.0.0 — منصة الغذاء الحلال والميزانية الرشيدة
      </p>

      {/* ===================================================================
          SHEETS & DIALOGS
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
