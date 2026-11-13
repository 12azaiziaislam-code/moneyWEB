import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Lock, Mail, ShieldCheck, Sparkles, User as UserIcon } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { cn } from '../components/ui';
import { Logo } from '../components/characters/Logo';
import { Sheikh } from '../components/characters/Sheikh';
import { DoctorChar } from '../components/characters/DoctorChar';
import { AccountantChar } from '../components/characters/AccountantChar';
import { LOCALE_LABEL, SUPPORTED_LOCALES } from '../../shared/constants';
import { changeLocale, type Locale } from '../i18n';
import { usePageTheme } from '../lib/theme';
import { haptic, HAPTIC } from '../lib/haptics';

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
  const { signIn, signInWithCredentials, registerWithCredentials, startGuest, error: authError, configured, guestEnabled } = useAuth();
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

  const errorMessage = localError || (authError ? (
    authError === 'popup_blocked'
      ? t('auth.blocked')
      : authError === 'guest_disabled'
        ? t('guest.disabled')
        : t('auth.error')
  ) : null);

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-app flex-col justify-between overflow-x-hidden bg-bg px-4 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[38vh] max-w-app"
        style={{
          background: 'linear-gradient(160deg, var(--hero-grad-a) 0%, var(--hero-grad-b) 100%)',
          borderBottomLeftRadius: 'var(--radius-2xl)',
          borderBottomRightRadius: 'var(--radius-2xl)',
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[38vh] max-w-app overflow-hidden">
        <div className="pattern-islamic absolute inset-0 opacity-[0.16]" />
      </div>

      <header className="relative z-10 flex flex-col items-center gap-1.5 text-center text-white">
        <div className="animate-pop">
          <Logo size={60} />
        </div>
        <h1 className="text-display text-[24px] font-extrabold leading-tight">{t('app.name')}</h1>
        <p className="max-w-[26ch] text-[12px] text-white/80">{t('app.tagline')}</p>
      </header>

      <div className="relative z-10 my-2 flex items-end justify-center gap-1" aria-hidden="true">
        <div className="animate-float">
          <Sheikh size={82} />
        </div>
        <div className="animate-float" style={{ animationDelay: '.5s' }}>
          <DoctorChar size={90} />
        </div>
        <div className="animate-float" style={{ animationDelay: '1s' }}>
          <AccountantChar size={82} mood="happy" />
        </div>
      </div>

      <section className="relative z-10 space-y-3">
        <div className="surface-card space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {SUPPORTED_LOCALES.map((locale: Locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => void changeLocale(locale)}
                  aria-pressed={i18n.language === locale}
                  className={cn(
                    'min-h-[30px] rounded-full px-2.5 text-[11px] font-bold transition-colors',
                    i18n.language === locale ? 'bg-accent text-accent-fg' : 'bg-surface2 text-muted',
                  )}
                >
                  {LOCALE_LABEL[locale]}
                </button>
              ))}
            </div>

            <div className="flex rounded-lg bg-surface2 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setLocalError(null);
                }}
                className={cn(
                  'rounded-md px-3 py-1 text-[12px] font-bold transition-all',
                  tab === 'signin' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
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
                  'rounded-md px-3 py-1 text-[12px] font-bold transition-all',
                  tab === 'register' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
                )}
              >
                {t('auth.registerTab')}
              </button>
            </div>
          </div>

          {errorMessage ? (
            <p className="rounded-md bg-dangerSoft p-2 text-[12px] font-semibold text-danger" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2.5">
            {tab === 'signin' ? (
              <>
                <Input
                  label={t('auth.loginOrEmail')}
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  autoComplete="username"
                  required
                  suffix={<UserIcon className="h-4 w-4" />}
                />
                <Input
                  label={t('auth.password')}
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoComplete="current-password"
                  required
                  suffix={<Lock className="h-4 w-4" />}
                />
                <Button
                  fullWidth
                  size="lg"
                  type="submit"
                  loading={busy === 'credentials'}
                  disabled={busy !== null}
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
                  suffix={<UserIcon className="h-4 w-4" />}
                />
                <Input
                  label={t('auth.email')}
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  autoComplete="email"
                  required
                  suffix={<Mail className="h-4 w-4" />}
                />
                <Input
                  label={t('auth.password')}
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  hint={t('auth.passwordHint')}
                  autoComplete="new-password"
                  required
                  suffix={<Lock className="h-4 w-4" />}
                />
                <Button
                  fullWidth
                  size="lg"
                  type="submit"
                  loading={busy === 'credentials'}
                  disabled={busy !== null}
                >
                  {t('auth.submitRegister')}
                </Button>
              </>
            )}
          </form>

          <div className="relative my-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <span className="relative bg-surface px-2 text-[11px] uppercase text-muted">
              {t('auth.or')}
            </span>
          </div>

          <div className="space-y-2">
            {configured ? (
              <Button
                fullWidth
                variant="secondary"
                size="md"
                loading={busy === 'google'}
                disabled={busy !== null}
                onClick={() => void runGoogle()}
                icon={<GoogleMark />}
              >
                {busy === 'google' ? t('auth.signingIn') : t('auth.google')}
              </Button>
            ) : null}

            {guestEnabled ? (
              <Button
                fullWidth
                variant="soft"
                size="md"
                loading={busy === 'guest'}
                disabled={busy !== null}
                onClick={() => void runGuest()}
                icon={<Sparkles className="h-4 w-4 text-accent" aria-hidden />}
                trailing={<ArrowRight className="flip-rtl h-4 w-4 text-muted" aria-hidden />}
              >
                {t('guest.try')}
              </Button>
            ) : null}
          </div>

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
            {t('onboarding2.guestNote')}
          </p>
        </div>

        <p className="px-1 text-center text-[10px] leading-relaxed text-muted">{t('consent.body')}</p>
      </section>
    </div>
  );
}
