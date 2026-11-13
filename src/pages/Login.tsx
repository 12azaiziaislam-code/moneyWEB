/**
 * Baraka v2 — Focused Authentication Portal
 * Quiet, elegant entry point for credentials, Google OAuth, and local guest mode.
 * Replaces noisy landing page layout with a dignified, studio-grade aesthetic.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Lock,
  Mail,
  User as UserIcon,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { cn } from '../components/ui';
import { SUPPORTED_LOCALES } from '../../shared/constants';
import { changeLocale } from '../i18n';
import { usePageTheme, systemPrefersDark } from '../lib/theme';
import { haptic, HAPTIC } from '../lib/haptics';
import { Logo } from '../components/characters/Logo';
import { IslamicPattern } from '../components/ui/IslamicPattern';

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
    setThemeMode(isDark ? 'light' : 'dark');
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
    <div className="relative min-h-[100dvh] w-full bg-bg text-fg flex flex-col justify-between p-4 sm:p-6">
      {/* Background Pattern */}
      <IslamicPattern />

      {/* Top Header: Brand & Utilities */}
      <header className="relative z-10 flex items-center justify-between max-w-md mx-auto w-full pt-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-e1">
            <Logo size={24} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-fg">
            {t('app.name')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <div className="flex rounded-lg border border-line bg-surface p-0.5">
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => {
                  void changeLocale(loc);
                  haptic(HAPTIC.tap);
                }}
                className={cn(
                  'px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer',
                  i18n.language === loc ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg',
                )}
              >
                {loc === 'ar' ? 'العربية' : loc === 'ru' ? 'RU' : 'EN'}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="تبديل السمة"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-fg cursor-pointer transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4 text-[var(--accent-2)]" /> : <Moon className="h-4 w-4 text-accent" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Box (Focused & Quiet) */}
      <main className="relative z-10 my-auto py-8 max-w-md mx-auto w-full">
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-e2 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-display text-2xl font-bold text-fg">
              {tab === 'signin' ? t('auth.title') : t('auth.registerTab')}
            </h1>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {t('auth.subtitle')}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface2 p-1">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setLocalError(null);
              }}
              className={cn(
                'py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer',
                tab === 'signin'
                  ? 'bg-surface text-fg shadow-e1 border border-line/60'
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
                'py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer',
                tab === 'register'
                  ? 'bg-surface text-fg shadow-e1 border border-line/60'
                  : 'text-muted hover:text-fg',
              )}
            >
              {t('auth.registerTab')}
            </button>
          </div>

          {/* Error Message */}
          {errorMessage ? (
            <div className="rounded-xl border border-danger/40 bg-danger-soft/60 p-3 text-xs font-semibold text-danger leading-relaxed">
              {errorMessage}
            </div>
          ) : null}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' ? (
              <Input
                label={t('auth.username')}
                value={usernameInput}
                autoComplete="username"
                onChange={(e) => setUsernameInput(e.target.value)}
                suffix={<UserIcon className="h-4 w-4 text-muted" />}
              />
            ) : null}

            {tab === 'register' ? (
              <Input
                label={t('auth.email')}
                type="email"
                value={emailInput}
                autoComplete="email"
                onChange={(e) => setEmailInput(e.target.value)}
                suffix={<Mail className="h-4 w-4 text-muted" />}
              />
            ) : (
              <Input
                label={t('auth.loginOrEmail')}
                value={loginInput}
                autoComplete="username"
                onChange={(e) => setLoginInput(e.target.value)}
                suffix={<UserIcon className="h-4 w-4 text-muted" />}
              />
            )}

            <Input
              label={t('auth.password')}
              type="password"
              value={passwordInput}
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              onChange={(e) => setPasswordInput(e.target.value)}
              suffix={<Lock className="h-4 w-4 text-muted" />}
              hint={tab === 'register' ? t('auth.passwordHint') : undefined}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              variant="primary"
              loading={busy === 'credentials'}
            >
              {tab === 'signin' ? t('auth.submitSignIn') : t('auth.submitRegister')}
            </Button>
          </form>

          {/* Google OAuth (if configured) */}
          {configured ? (
            <Button
              fullWidth
              size="md"
              variant="secondary"
              loading={busy === 'google'}
              onClick={runGoogle}
              icon={<GoogleMark />}
            >
              {t('auth.google')}
            </Button>
          ) : null}

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line/60" />
            </div>
            <span className="relative bg-surface px-3 text-[11px] font-bold text-muted uppercase">
              {t('auth.or')}
            </span>
          </div>

          {/* Guest Access Button */}
          {guestEnabled ? (
            <div className="space-y-2">
              <Button
                fullWidth
                size="md"
                variant="outline"
                loading={busy === 'guest'}
                onClick={runGuest}
              >
                {t('guest.cta')}
              </Button>
              <p className="text-center text-[11.5px] text-muted leading-relaxed">
                تصفح ميزات التطبيق محلياً على جهازك؛ تتطلب خدمات الذكاء الاصطناعي إنشاء حساب مجاني.
              </p>
            </div>
          ) : null}
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="relative z-10 text-center text-xs text-muted-soft max-w-md mx-auto w-full pb-2">
        <span>تشفير تام عبر HTTPS · خصوصية وحفظ محلي</span>
      </footer>
    </div>
  );
}
