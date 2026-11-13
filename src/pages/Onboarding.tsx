/** First-run: three character slides, then consent (users) or a demo start (guests). */

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
    { art: <Sheikh size={150} />, title: t('onboarding2.slide1Title'), body: t('onboarding2.slide1Body') },
    { art: <DoctorChar size={150} />, title: t('onboarding2.slide2Title'), body: t('onboarding2.slide2Body') },
    { art: <AccountantChar size={150} mood="happy" />, title: t('onboarding2.slide3Title'), body: t('onboarding2.slide3Body') },
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
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-app flex-col bg-bg px-4 pb-[calc(1.25rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))]">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: total }).map((_, index) => (
            <span
              key={index}
              className={cn('h-1.5 rounded-full transition-all duration-300', index === step ? 'w-6 bg-accent' : 'w-1.5 bg-line')}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (isGuest ? void finishGuest(false) : next())}
          className="min-h-[36px] px-2 text-[12px] font-bold text-muted"
        >
          {t('onboarding2.skip')}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 text-center">
        {isSlides ? (
          <>
            <div className="animate-float">{slides[step].art}</div>
            <h1 className="text-display text-[24px] font-extrabold text-fg">{slides[step].title}</h1>
            <p className="max-w-[32ch] text-[14px] leading-relaxed text-muted">{slides[step].body}</p>
          </>
        ) : (
          <div className="w-full space-y-3 text-start">
            <h1 className="text-display text-[22px] font-extrabold text-fg">{t('onboarding2.consentTitle')}</h1>
            <p className="text-[13px] leading-relaxed text-muted">{t('onboarding2.consentBody')}</p>

            {isGuest ? (
              <>
                <Disclaimer>{t('guest.localOnly')}</Disclaimer>
                <Button fullWidth size="lg" loading={busy} onClick={() => void finishGuest(true)}>
                  {t('guest.demo')}
                </Button>
                <Button fullWidth variant="secondary" onClick={() => void finishGuest(false)}>
                  {t('onboarding2.start')}
                </Button>
              </>
            ) : (
              <>
                <Checkbox label={t('consent.health')} checked={consent} onChange={setConsent} />
                <p className="text-[13px] text-muted">{t('consent.finance')}</p>
                <Button
                  fullWidth
                  size="lg"
                  loading={busy}
                  disabled={!consent}
                  icon={<Check className="h-4 w-4" aria-hidden />}
                  onClick={() => void finishUser()}
                >
                  {t('consent.accept')}
                </Button>
                {!consent ? <p className="text-center text-[11px] text-warn">{t('consent.mustAccept')}</p> : null}
              </>
            )}
          </div>
        )}
      </div>

      {isSlides ? (
        <Button fullWidth size="lg" onClick={next} trailing={<ArrowRight className="flip-rtl h-4 w-4" aria-hidden />}>
          {t('onboarding2.next')}
        </Button>
      ) : (
        <p className="text-center text-[10px] leading-relaxed text-muted">{t('alerts.sharia')}</p>
      )}
    </div>
  );
}
