import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Wallet,
  Activity,
} from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { cn } from '../components/ui';
import { LOCALE_LABEL, SUPPORTED_LOCALES } from '../../shared/constants';
import { changeLocale, type Locale } from '../i18n';
import { usePageTheme } from '../lib/theme';
import { haptic, HAPTIC } from '../lib/haptics';

function BrandEmblem({ size = 48 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent p-2.5 ring-1 ring-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
        {/* Subtle Islamic 8-Pointed Star Lattice */}
        <rect
          x="12"
          y="12"
          width="24"
          height="24"
          rx="4"
          className="stroke-emerald-400/40"
          strokeWidth="1.5"
          transform="rotate(45 24 24)"
        />
        <rect
          x="12"
          y="12"
          width="24"
          height="24"
          rx="4"
          className="stroke-amber-400/50"
          strokeWidth="1.5"
        />
        {/* Elegant Crescent */}
        <path
          d="M26 15c-5.5 1.5-9 6.5-8 12s6 10 11.5 8.5c-4.5.5-9-2.5-10-7.5s2-9.5 6.5-13Z"
          fill="url(#goldGradient)"
        />
        {/* Guiding Star */}
        <polygon
          points="31,18 32.2,21.5 35.8,21.5 33,23.6 34,27 31,25 28,27 29,23.6 26.2,21.5 29.8,21.5"
          fill="url(#goldGradient)"
        />
        <defs>
          <linearGradient id="goldGradient" x1="16" y1="14" x2="36" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE68A" />
            <stop offset="0.5" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.8V7.6H3.1a10 10 0 0 0 0 8.9L6.4 14Z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.6l3.3 2.6A5.9 5.9 0 0 1 12 6.1Z" />
    </svg>
  );
}

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const {
    signIn,
    signInWithCredentials,
    registerWithCredentials,
    startGuest,
    error: authError,
    configured,
    guestEnabled,
  } = useAuth();

  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [loginInput, setLoginInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'credentials' | 'google' | 'guest' | null>(null);

  usePageTheme('halal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (tab === 'signin') {
      if (!loginInput.trim() || !passwordInput) {
        setLocalError(t('auth.error'));
        return;
      }
      setBusy('credentials');
      haptic(HAPTIC.select);
      try {
        await signInWithCredentials(loginInput.trim(), passwordInput);
      } catch (err: unknown) {
        setLocalError(err instanceof Error ? err.message : t('auth.error'));
      } finally {
        setBusy(null);
      }
    } else {
      if (!usernameInput.trim() || !emailInput.trim() || !passwordInput) {
        setLocalError(t('auth.error'));
        return;
      }
      if (passwordInput.length < 6) {
        setLocalError(t('auth.passwordHint'));
        return;
      }
      setBusy('credentials');
      haptic(HAPTIC.select);
      try {
        await registerWithCredentials(emailInput.trim(), usernameInput.trim(), passwordInput);
      } catch (err: unknown) {
        setLocalError(err instanceof Error ? err.message : t('auth.error'));
      } finally {
        setBusy(null);
      }
    }
  };

  const runGoogle = async () => {
    setLocalError(null);
    setBusy('google');
    haptic(HAPTIC.select);
    try {
      await signIn();
    } finally {
      setBusy(null);
    }
  };

  const runGuest = async () => {
    setLocalError(null);
    setBusy('guest');
    haptic(HAPTIC.select);
    try {
      await startGuest();
    } finally {
      setBusy(null);
    }
  };

  const errorMessage =
    localError ||
    (authError
      ? authError === 'popup_blocked'
        ? t('auth.blocked')
        : authError === 'guest_disabled'
          ? t('guest.disabled')
          : t('auth.error')
      : null);

  const features = [
    {
      title: i18n.language === 'ar' ? 'التدقيق الشرعي المالي' : 'Halal Financial Intelligence',
      desc:
        i18n.language === 'ar'
          ? 'فحص شرعي فوري للأسهم، المعاملات، ونسب التطهير بدقة فائقة.'
          : 'Instant halal analysis of stocks, transactions, and purification ratios.',
      Icon: ShieldCheck,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: i18n.language === 'ar' ? 'المحاسب الذكي والزكاة' : 'Smart Wealth & Zakat',
      desc:
        i18n.language === 'ar'
          ? 'إدارة الميزانية الشخصية، تتبع المصروفات، وحساب زكاة المال بدقة.'
          : 'Personal budgeting, expense tracking, and precise Zakat calculation.',
      Icon: Wallet,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: i18n.language === 'ar' ? 'المستشار الصحي والغذائي' : 'Pure Health & Nutrition',
      desc:
        i18n.language === 'ar'
          ? 'فحص الأغذية والأدوية للتأكد من سلامتها وخلوها من المحرمات.'
          : 'AI food & medicine scanning for dietary purity and wellness.',
      Icon: Activity,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    },
  ];

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#071311] text-slate-100 font-body selection:bg-emerald-500 selection:text-white">
      {/* Ambient Islamic Lattice Background */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]">
        <div className="pattern-islamic absolute inset-0 bg-repeat" />
      </div>

      {/* Radiant glow orbs for luxury depth */}
      <div
        className="pointer-events-none fixed -top-40 start-10 h-96 w-96 rounded-full bg-emerald-500/15 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed -bottom-40 end-10 h-96 w-96 rounded-full bg-teal-600/10 blur-[140px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto min-h-[100dvh] max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col justify-between">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="flex items-center gap-3">
            <BrandEmblem size={44} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-extrabold tracking-tight text-white">
                  {t('app.name')}
                </span>
                <span className="hidden sm:inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                  AI Financial & Ethical Portal
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/60 hidden sm:block">
                {t('app.tagline')}
              </p>
            </div>
          </div>

          {/* Clean Segmented Language Switcher */}
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md">
            <Globe className="ms-2 h-3.5 w-3.5 text-emerald-400/80" aria-hidden="true" />
            {SUPPORTED_LOCALES.map((locale: Locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => void changeLocale(locale)}
                aria-pressed={i18n.language === locale}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200',
                  i18n.language === locale
                    ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5',
                )}
              >
                {LOCALE_LABEL[locale]}
              </button>
            ))}
          </div>
        </header>

        {/* Main Split Layout */}
        <main className="my-auto py-8 sm:py-12 grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left / Brand Narrative Column (Desktop 7 cols) */}
          <section className="lg:col-span-7 flex flex-col justify-center space-y-6 sm:space-y-8 text-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-medium text-amber-200 w-fit">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>
                {i18n.language === 'ar'
                  ? 'منظومة الذكاء الاصطناعي الشرعي والمالي'
                  : 'AI-Powered Halal & Wealth Advisory'}
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.2]">
                {i18n.language === 'ar' ? (
                  <>
                    استثمر بوعي، وتداول بحلال،{' '}
                    <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                      وأدر ثروتك ببركة.
                    </span>
                  </>
                ) : (
                  <>
                    Invest with confidence, verify halal,{' '}
                    <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                      and grow with Baraka.
                    </span>
                  </>
                )}
              </h1>
              <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-slate-300/90 font-normal">
                {i18n.language === 'ar'
                  ? 'منصتك الموثوقة للفحص الشرعي الفوري للمعاملات والأسهم، المحاسبة الذكية، والاستشارات الصحية والغذائية — مستندة إلى الضوابط الشرعية المعتمدة وأحدث تقنيات التحليل.'
                  : 'Your intelligent advisory portal for halal stock screening, ethical accounting, and wellness analysis — built with privacy, precision, and verified standards.'}
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              {features.map(({ title, desc, Icon, color }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm transition-all hover:border-emerald-500/40 hover:bg-white/[0.04]"
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border mb-3', color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-white mb-1">{title}</h3>
                  <p className="text-xs leading-relaxed text-slate-400">{desc}</p>
                </div>
              ))}
            </div>

            {/* Trust Assurance */}
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{i18n.language === 'ar' ? 'تشفير وحماية بيانات تامة' : 'Bank-grade encryption'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{i18n.language === 'ar' ? 'استجابة فائقة السرعة' : 'Ultra-fast AI engine'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{i18n.language === 'ar' ? 'مستند لضوابط شرعية دقيقة' : 'Compliant standards'}</span>
              </div>
            </div>
          </section>

          {/* Right / Authentication Portal Column (Desktop 5 cols) */}
          <section className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#0f2420]/90 to-[#0a1815]/95 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
              {/* Inner card subtle glow */}
              <div className="pointer-events-none absolute -top-12 inset-x-0 mx-auto h-24 w-48 rounded-full bg-emerald-500/10 blur-xl" />

              <div className="relative mb-6">
                <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('signin');
                      setLocalError(null);
                    }}
                    className={cn(
                      'flex-1 rounded-lg py-2.5 text-xs sm:text-sm font-bold transition-all duration-200',
                      tab === 'signin'
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                        : 'text-slate-300 hover:text-white',
                    )}
                  >
                    {t('auth.signInTab')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('register');
                      setLocalError(null);
                    }}
                    className={cn(
                      'flex-1 rounded-lg py-2.5 text-xs sm:text-sm font-bold transition-all duration-200',
                      tab === 'register'
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                        : 'text-slate-300 hover:text-white',
                    )}
                  >
                    {t('auth.registerTab')}
                  </button>
                </div>
              </div>

              {errorMessage ? (
                <div
                  className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-200"
                  role="alert"
                >
                  {errorMessage}
                </div>
              ) : null}

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                {tab === 'signin' ? (
                  <>
                    <Input
                      label={t('auth.loginOrEmail')}
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      autoComplete="username"
                      required
                      suffix={<UserIcon className="h-4 w-4 text-emerald-400/80" />}
                    />
                    <Input
                      label={t('auth.password')}
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      autoComplete="current-password"
                      required
                      suffix={<Lock className="h-4 w-4 text-emerald-400/80" />}
                    />
                    <Button
                      fullWidth
                      size="lg"
                      type="submit"
                      loading={busy === 'credentials'}
                      disabled={busy !== null}
                      className="mt-2 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25 border-none"
                    >
                      {t('auth.submitSignIn')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      label={t('auth.username')}
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      autoComplete="username"
                      required
                      suffix={<UserIcon className="h-4 w-4 text-emerald-400/80" />}
                    />
                    <Input
                      label={t('auth.email')}
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      autoComplete="email"
                      required
                      suffix={<Mail className="h-4 w-4 text-emerald-400/80" />}
                    />
                    <Input
                      label={t('auth.password')}
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      hint={t('auth.passwordHint')}
                      autoComplete="new-password"
                      required
                      suffix={<Lock className="h-4 w-4 text-emerald-400/80" />}
                    />
                    <Button
                      fullWidth
                      size="lg"
                      type="submit"
                      loading={busy === 'credentials'}
                      disabled={busy !== null}
                      className="mt-2 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25 border-none"
                    >
                      {t('auth.submitRegister')}
                    </Button>
                  </>
                )}
              </form>

              {/* Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative bg-[#0d211d] px-3 text-[11px] font-semibold text-slate-400">
                  {t('auth.or')}
                </span>
              </div>

              {/* Secondary Options */}
              <div className="space-y-3">
                {configured ? (
                  <Button
                    fullWidth
                    variant="secondary"
                    size="md"
                    loading={busy === 'google'}
                    disabled={busy !== null}
                    onClick={() => void runGoogle()}
                    icon={<GoogleMark />}
                    className="h-11 border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  >
                    {busy === 'google' ? t('auth.signingIn') : t('auth.google')}
                  </Button>
                ) : null}

                {guestEnabled ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void runGuest()}
                    className="w-full group flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-200 transition-all hover:bg-emerald-500/15 hover:border-emerald-500/30"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                      <span>{t('guest.try')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400/80 group-hover:text-emerald-300">
                      <span>{i18n.language === 'ar' ? 'تجربة فورية' : 'Instant Demo'}</span>
                      <ArrowRight className="flip-rtl h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                    </div>
                  </button>
                ) : null}
              </div>

              {/* Reassurance Note */}
              <div className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <p>{t('onboarding2.guestNote')}</p>
              </div>

              <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-500">
                {t('consent.body')}
              </p>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} بركة (Baraka) — جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>فحص شرعي ذكي</span>
            <span>•</span>
            <span>حساب الزكاة والمال</span>
            <span>•</span>
            <span>سلامة الغذاء والصحة</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
