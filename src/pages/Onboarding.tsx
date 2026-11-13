/**
 * First-run walkthrough: Three architectural capability overviews, followed by data consent.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Field';
import { Disclaimer } from '../components/ui/Feedback';
import { cn } from '../components/ui';
import { Sheikh } from '../components/characters/Sheikh';
import { DoctorChar } from '../components/characters/DoctorChar';
import { AccountantChar } from '../components/characters/AccountantChar';
import { usePageTheme } from '../lib/theme';
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
  const { role, patchUser, fillDemoData } = useAuth();
  const { show } = useToast();
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  usePageTheme('halal');

  const isGuest = role === 'guest';
  const total = 4;
  const slides = [
    { art: <Sheikh size={120} />, title: t('onboarding2.slide1Title'), body: t('onboarding2.slide1Body') },
    { art: <DoctorChar size={120} />, title: t('onboarding2.slide2Title'), body: t('onboarding2.slide2Body') },
    { art: <AccountantChar size={120} mood="happy" />, title: t('onboarding2.slide3Title'), body: t('onboarding2.slide3Body') },
  ];

  const next = () => {
    haptic(HAPTIC.tap);
    setStep((value) => Math.min(total - 1, value + 1));
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
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col bg-bg px-4 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))] text-fg">
      {/* Top Header with Progress Bars */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex gap-2" aria-hidden="true">
          {Array.from({ length: total }).map((_, index) => (
            <span
              key={index}
              className={cn(
                'h-1 rounded transition-all duration-fast',
                index === step ? 'w-8 bg-accent' : 'w-3 bg-line',
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (isGuest ? void finishGuest(false) : next())}
          className="min-h-[36px] px-2 text-xs font-semibold text-muted hover:text-fg"
        >
          {t('onboarding2.skip')}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
        {isSlides ? (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-xl border border-line bg-surface shadow-sm">
              {slides[step].art}
            </div>
            <h1 className="text-display text-2xl font-bold text-fg mt-2">{slides[step].title}</h1>
            <p className="max-w-[36ch] text-sm leading-relaxed text-muted">{slides[step].body}</p>
          </div>
        ) : (
          <div className="w-full space-y-4 text-start surface-card p-6">
            <div>
              <h1 className="text-display text-xl font-bold text-fg">{t('onboarding2.consentTitle')}</h1>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t('onboarding2.consentBody')}</p>
            </div>

            {isGuest ? (
              <div className="space-y-3 pt-2">
                <Disclaimer>{t('guest.localOnly')}</Disclaimer>
                <Button fullWidth size="lg" loading={busy} onClick={() => void finishGuest(true)}>
                  {t('guest.demo')}
                </Button>
                <Button fullWidth variant="secondary" onClick={() => void finishGuest(false)}>
                  {t('onboarding2.start')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <Checkbox label={t('consent.health')} checked={consent} onChange={setConsent} />
                <p className="text-xs text-muted leading-relaxed">{t('consent.finance')}</p>
                <Button
                  fullWidth
                  size="lg"
                  loading={busy}
                  disabled={!consent}
                  icon={<Check className="h-4 w-4" aria-hidden />}
                  onClick={() => void finishUser()}
                  className="mt-2"
                >
                  {t('consent.accept')}
                </Button>
                {!consent ? <p className="text-center text-[11px] text-warn font-semibold">{t('consent.mustAccept')}</p> : null}
              </div>
            )}
          </div>
        )}
      </div>

      {isSlides ? (
        <Button fullWidth size="lg" onClick={next} trailing={<ArrowRight className="flip-rtl h-4 w-4" aria-hidden />}>
          {t('onboarding2.next')}
        </Button>
      ) : (
        <p className="text-center text-[11px] leading-relaxed text-muted">{t('alerts.sharia')}</p>
      )}
    </div>
  );
}
