/**
 * Baraka v2 — First-Run Walkthrough & Privacy Consent
 * 3 Capability Seals (Halal Audit, Health & Dietary Safety, Disciplined Budgeting),
 * followed by sovereign data privacy and consent protocol.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  Lock,
  Database,
  Sun,
  Moon,
  Stethoscope,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Field';
import { cn } from '../components/ui';
import { IslamicPattern } from '../components/ui/IslamicPattern';
import { usePageTheme, systemPrefersDark } from '../lib/theme';
import { haptic, HAPTIC } from '../lib/haptics';

const GUEST_INTRO_KEY = 'baraka.guestIntro';

export function guestIntroSeen(): boolean {
  try {
    return localStorage.getItem(GUEST_INTRO_KEY) === '1';
  } catch {
    return true;
  }
}

export function OnboardingPage() {
  const { t } = useTranslation();
  const { role, patchUser, fillDemoData, themeMode, setThemeMode } = useAuth();
  const { show } = useToast();
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  usePageTheme('halal');

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark());
  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
    haptic(HAPTIC.tap);
  };

  const isGuest = role === 'guest';
  const total = 4;

  const slides = [
    {
      pillar: t('onboarding.pillar1'),
      icon: <ShieldCheck className="h-16 w-16 text-accent" strokeWidth={1.8} />,
      title: t('onboarding2.slide1Title'),
      body: t('onboarding2.slide1Body'),
    },
    {
      pillar: t('onboarding.pillar2'),
      icon: <Stethoscope className="h-16 w-16 text-accent" strokeWidth={1.8} />,
      title: t('onboarding2.slide2Title'),
      body: t('onboarding2.slide2Body'),
    },
    {
      pillar: t('onboarding.pillar3'),
      icon: <Wallet className="h-16 w-16 text-accent" strokeWidth={1.8} />,
      title: t('onboarding2.slide3Title'),
      body: t('onboarding2.slide3Body'),
    },
  ];

  const next = () => {
    haptic(HAPTIC.tap);
    setStep((value) => Math.min(total - 1, value + 1));
  };

  const prev = () => {
    haptic(HAPTIC.tap);
    setStep((value) => Math.max(0, value - 1));
  };

  const finishUser = async () => {
    setBusy(true);
    try {
      await patchUser({ consent: true, onboardingDone: true });
      haptic(HAPTIC.success);
    } catch {
      show(t('errors.generic'), 'danger');
    } finally {
      setBusy(false);
    }
  };

  const finishGuest = async (withDemo: boolean) => {
    setBusy(true);
    try {
      if (withDemo) await fillDemoData();
      try {
        localStorage.setItem(GUEST_INTRO_KEY, '1');
      } catch {
        /* private mode */
      }
      haptic(HAPTIC.success);
      if (withDemo) show(t('guest.demoApplied'), 'success');
      setForceReady(true);
    } finally {
      setBusy(false);
    }
  };

  if (forceReady) return null;
  const isSlides = step < 3;

  return (
    <div className="relative min-h-[100dvh] w-full bg-bg text-fg flex flex-col justify-center items-center px-4 py-8 sm:px-6">
      <IslamicPattern />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-line bg-surface p-6 sm:p-9 shadow-e3 flex flex-col justify-between overflow-hidden">
        {/* Header: Progress Stepper & Actions */}
        <div className="flex items-center justify-between pb-5 border-b border-line/60">
          <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of ${total}`}>
            {Array.from({ length: total }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  index === step
                    ? 'w-8 bg-accent'
                    : index < step
                      ? 'w-3.5 bg-accent/50'
                      : 'w-2.5 bg-border',
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="تبديل السمة"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface2 text-muted hover:text-fg transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="h-4 w-4 text-[var(--accent-2)]" /> : <Moon className="h-4 w-4 text-accent" />}
            </button>

            <button
              type="button"
              onClick={() => (isGuest ? void finishGuest(false) : next())}
              className="text-xs font-bold text-muted hover:text-fg px-2.5 py-1 rounded-md hover:bg-surface2 cursor-pointer transition-colors"
            >
              {t('onboarding2.skip')}
            </button>
          </div>
        </div>

        {/* Content Arena */}
        <div className="py-6 sm:py-8 flex flex-col items-center text-center">
          {isSlides ? (
            <div className="flex flex-col items-center w-full space-y-4">
              {/* Pillar Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-1 text-xs font-bold text-accent">
                <span>{slides[step].pillar}</span>
              </div>

              {/* Icon Emblem Showcase */}
              <div className="my-2 flex h-24 w-24 items-center justify-center rounded-2xl bg-surface2 border border-line/80 shadow-e1">
                {slides[step].icon}
              </div>

              {/* Title & Body */}
              <div className="space-y-2">
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-fg">
                  {slides[step].title}
                </h1>
                <p className="max-w-[40ch] mx-auto text-xs sm:text-sm leading-relaxed text-muted font-normal">
                  {slides[step].body}
                </p>
              </div>
            </div>
          ) : (
            /* Step 4: Data Governance & Privacy Consent */
            <div className="w-full text-start space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-display text-lg sm:text-xl font-bold text-fg">
                    {t('onboarding2.consentTitle')}
                  </h1>
                  <p className="text-xs text-muted leading-relaxed">
                    {t('onboarding2.consentBody')}
                  </p>
                </div>
              </div>

              {/* Privacy Guarantees Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-xl border border-line bg-surface2/60 flex items-start gap-2.5">
                  <Lock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-muted leading-relaxed">
                    {t('onboarding.encryption')}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-line bg-surface2/60 flex items-start gap-2.5">
                  <Database className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-muted leading-relaxed">
                    {t('onboarding.localStorage')}
                  </p>
                </div>
              </div>

              {isGuest ? (
                <div className="space-y-3 pt-3 border-t border-line/60">
                  <div className="rounded-xl border border-line bg-surface2/50 p-3 text-xs text-muted leading-relaxed">
                    {t('guest.localOnly')}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <Button
                      fullWidth
                      size="lg"
                      variant="primary"
                      loading={busy}
                      onClick={() => void finishGuest(true)}
                    >
                      {t('guest.demo')}
                    </Button>
                    <Button
                      fullWidth
                      variant="secondary"
                      size="lg"
                      onClick={() => void finishGuest(false)}
                    >
                      {t('onboarding2.start')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-3 border-t border-line/60">
                  <div className="space-y-2">
                    <Checkbox
                      label={t('consent.health')}
                      checked={consent}
                      onChange={setConsent}
                    />
                    <p className="text-xs text-muted ps-7 leading-relaxed">
                      {t('consent.finance')}
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      fullWidth
                      size="lg"
                      variant="primary"
                      disabled={!consent || busy}
                      loading={busy}
                      onClick={() => void finishUser()}
                    >
                      <Check className="h-4 w-4 me-1.5" />
                      <span>{t('consent.accept')}</span>
                    </Button>
                    {!consent ? (
                      <p className="text-center text-xs text-warn font-semibold mt-2">
                        {t('consent.mustAccept')}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {isSlides && (
          <div className="pt-5 border-t border-line/60 flex items-center justify-between gap-4">
            {step > 0 ? (
              <Button size="sm" variant="ghost" onClick={prev} icon={<ArrowLeft className="flip-rtl h-4 w-4" />}>
                {t('common.back')}
              </Button>
            ) : (
              <div />
            )}

            <Button
              size="md"
              variant="primary"
              onClick={next}
              trailing={<ArrowRight className="flip-rtl h-4 w-4" />}
            >
              {t('onboarding2.next')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
