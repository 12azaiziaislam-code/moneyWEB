import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { cn } from '../components/ui';
import { LOCALE_LABEL, SUPPORTED_LOCALES } from '../../shared/constants';
import { changeLocale, type Locale } from '../i18n';
import { usePageTheme, systemPrefersDark } from '../lib/theme';
import { haptic, HAPTIC } from '../lib/haptics';
import { Logo } from '../components/characters/Logo';
import { IslamicPattern } from '../components/ui';

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
    themeMode,
    setThemeMode,
  } = useAuth();

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark());
  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setThemeMode(next);
    haptic(HAPTIC.tap);
  };

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



  return (
    <div className="relative min-h-[100dvh] w-full bg-bg text-fg font-body selection:bg-accent selection:text-accent-fg">
      {/* Sovereign Islamic Architectural Backdrop & Ambient Illumination */}
      <IslamicPattern />

      <div className="relative z-10 mx-auto min-h-[100dvh] max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col justify-between">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between pb-4 border-b border-line">
          <div className="flex items-center gap-3.5">
            <Logo size={42} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-bold tracking-tight text-fg">
                  {t('app.name')}
                </span>
                <span className="hidden sm:inline-flex rounded-full border border-[#B88E3E]/30 bg-[#B88E3E]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#B88E3E] dark:text-[#D4AF37]">
                  {t('landing.badge')}
                </span>
              </div>
              <p className="text-[12px] text-muted hidden sm:block">
                {t('app.tagline')}
              </p>
            </div>
          </div>

          {/* Controls: Theme Toggle & Clean Segmented Language Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? t('profile.themes.light') : t('profile.themes.dark')}
              title={isDark ? t('profile.themes.light') : t('profile.themes.dark')}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-muted hover:text-fg hover:bg-surface2 shadow-sm transition-colors"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-[#45392B]" aria-hidden="true" />
              )}
            </button>

            <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-1 shadow-sm">
              <Globe className="ms-1.5 me-0.5 h-3.5 w-3.5 text-muted" aria-hidden="true" />
              {SUPPORTED_LOCALES.map((locale: Locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => void changeLocale(locale)}
                  aria-pressed={i18n.language === locale}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-semibold transition-colors duration-fast',
                    i18n.language === locale
                      ? 'bg-surface2 text-fg font-bold border border-line shadow-sm'
                      : 'text-muted hover:text-fg hover:bg-surface2',
                  )}
                >
                  {LOCALE_LABEL[locale]}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Main Split Layout */}
        <main className="my-auto py-8 sm:py-12 grid gap-10 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Brand Mission & Capabilities (7 cols) */}
          <section className="lg:col-span-7 flex flex-col justify-center space-y-6 text-start">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B88E3E]/30 bg-[#B88E3E]/10 px-3 py-1 text-xs font-semibold text-[#B88E3E] dark:text-[#D4AF37]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B88E3E] dark:bg-[#D4AF37]" />
                {t('landing.badge')}
              </span>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-fg leading-snug">
                {t('landing.headline')}
              </h1>
              <p className="max-w-xl text-sm sm:text-base leading-relaxed text-muted font-normal">
                {t('landing.description')}
              </p>
            </div>

            {/* Core Pillars */}
            <div className="space-y-3.5 pt-1">
              <div className="flex items-start gap-3.5 rounded-lg border border-line bg-surface/80 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#B88E3E]/30 bg-[#B88E3E]/10 text-[#B88E3E] dark:text-[#D4AF37]">
                  <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-fg mb-0.5">{t('landing.cap1Title')}</h2>
                  <p className="text-xs leading-relaxed text-muted">{t('landing.cap1Desc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-lg border border-line bg-surface/80 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#B88E3E]/30 bg-[#B88E3E]/10 text-[#B88E3E] dark:text-[#D4AF37]">
                  <Wallet className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-fg mb-0.5">{t('landing.cap2Title')}</h2>
                  <p className="text-xs leading-relaxed text-muted">{t('landing.cap2Desc')}</p>
                </div>
              </div>
            </div>

            {/* Trust Assurance (Honest & Verified) */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-3.5 pt-1 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#B88E3E] dark:text-[#D4AF37]" />
                {t('landing.trustPrivacy')}
              </span>
              <span className="text-muted/40">•</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#B88E3E] dark:text-[#D4AF37]" />
                {t('landing.trustSecurity')}
              </span>
              <span className="text-muted/40">•</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#B88E3E] dark:text-[#D4AF37]" />
                {t('landing.trustStandards')}
              </span>
            </div>
          </section>

          {/* Right Column: Authentication Card (5 cols) */}
          <section className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
            <div className="surface-card p-6 sm:p-8 relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-80" />
              {/* Tab Selector */}
              <div className="mb-6">
                <div className="flex rounded-md border border-line bg-surface2 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('signin');
                      setLocalError(null);
                    }}
                    className={cn(
                      'flex-1 rounded py-2 text-xs sm:text-sm font-semibold transition-colors duration-fast',
                      tab === 'signin'
                        ? 'bg-surface text-fg font-bold shadow-sm'
                        : 'text-muted hover:text-fg',
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
                      'flex-1 rounded py-2 text-xs sm:text-sm font-semibold transition-colors duration-fast',
                      tab === 'register'
                        ? 'bg-surface text-fg font-bold shadow-sm'
                        : 'text-muted hover:text-fg',
                    )}
                  >
                    {t('auth.registerTab')}
                  </button>
                </div>
              </div>

              {errorMessage ? (
                <div
                  className="mb-5 rounded-md border border-danger/30 bg-dangerSoft p-3 text-xs font-medium text-danger"
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
                      suffix={<UserIcon className="h-4 w-4 text-muted" />}
                    />
                    <Input
                      label={t('auth.password')}
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      autoComplete="current-password"
                      required
                      suffix={<Lock className="h-4 w-4 text-muted" />}
                    />
                    <Button
                      fullWidth
                      size="lg"
                      type="submit"
                      loading={busy === 'credentials'}
                      disabled={busy !== null}
                      className="mt-2 h-11 bg-[#164E3F] hover:bg-[#1C5C4A] text-white font-bold border border-[#277D64]/30 shadow-sm"
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
                      suffix={<UserIcon className="h-4 w-4 text-muted" />}
                    />
                    <Input
                      label={t('auth.email')}
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      autoComplete="email"
                      required
                      suffix={<Mail className="h-4 w-4 text-muted" />}
                    />
                    <Input
                      label={t('auth.password')}
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      hint={t('auth.passwordHint')}
                      autoComplete="new-password"
                      required
                      suffix={<Lock className="h-4 w-4 text-muted" />}
                    />
                    <Button
                      fullWidth
                      size="lg"
                      type="submit"
                      loading={busy === 'credentials'}
                      disabled={busy !== null}
                      className="mt-2 h-11 bg-[#164E3F] hover:bg-[#1C5C4A] text-white font-bold border border-[#277D64]/30 shadow-sm"
                    >
                      {t('auth.submitRegister')}
                    </Button>
                  </>
                )}
              </form>

              {/* Divider */}
              <div className="relative my-5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line" />
                </div>
                <span className="relative bg-surface px-3 text-[11px] font-semibold text-muted">
                  {t('auth.or')}
                </span>
              </div>

              {/* Secondary Options */}
              <div className="space-y-2.5">
                {configured ? (
                  <Button
                    fullWidth
                    variant="secondary"
                    size="md"
                    loading={busy === 'google'}
                    disabled={busy !== null}
                    onClick={() => void runGoogle()}
                    icon={<GoogleMark />}
                    className="h-10"
                  >
                    {busy === 'google' ? t('auth.signingIn') : t('auth.google')}
                  </Button>
                ) : null}

                {guestEnabled ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void runGuest()}
                    className="w-full group flex items-center justify-between rounded-md border border-line bg-surface hover:bg-surface2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-fg hover:border-[#B88E3E]/50 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#B88E3E] dark:text-[#D4AF37]" />
                      <span>{t('guest.try')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted group-hover:text-fg">
                      <span>{t('landing.instantDemo')}</span>
                      <ArrowRight className="flip-rtl h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                    </div>
                  </button>
                ) : null}
              </div>

              {/* Consent Note */}
              <div className="mt-5 border-t border-line/60 pt-3 text-[11px] leading-relaxed text-muted">
                <p>{t('onboarding2.guestNote')}</p>
                <p className="mt-1 text-[10px] text-muted/80">{t('consent.body')}</p>
              </div>
            </div>
          </section>
        </main>

        {/* Footer (100% Multilingual & Localized) */}
        <footer className="py-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <p>{t('landing.footerCopyright', { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-3 text-[11px]">
            <span>{t('landing.footerHalal')}</span>
            <span>•</span>
            <span>{t('landing.footerBudget')}</span>
            <span>•</span>
            <span>{t('landing.footerHealth')}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
