/**
 * First-run Sovereign Walkthrough: Three institutional capability seals,
 * followed by sovereign data privacy & consent agreement.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft, Check, ShieldCheck, Lock, Database } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Field';
import { cn } from '../components/ui';
import { IslamicPattern } from '../components/ui/IslamicPattern';
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
  const { t, i18n } = useTranslation();
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
    {
      pillar:
        i18n.language === 'ar'
          ? 'الركن الأول: الفحص الشرعي'
          : i18n.language === 'ru'
            ? 'Первый столп: Халяль-аудит'
            : 'First Pillar: Halal Verification',
      art: <Sheikh size={140} />,
      title: t('onboarding2.slide1Title'),
      body: t('onboarding2.slide1Body'),
    },
    {
      pillar:
        i18n.language === 'ar'
          ? 'الركن الثاني: السلامة الصحية والغذائية'
          : i18n.language === 'ru'
            ? 'Второй столп: Здоровье и безопасность'
            : 'Second Pillar: Health & Dietary Safety',
      art: <DoctorChar size={140} />,
      title: t('onboarding2.slide2Title'),
      body: t('onboarding2.slide2Body'),
    },
    {
      pillar:
        i18n.language === 'ar'
          ? 'الركن الثالث: الميزانية الشخصية'
          : i18n.language === 'ru'
            ? 'Третий столп: Личный бюджет'
            : 'Third Pillar: Disciplined Budgeting',
      art: <AccountantChar size={140} />,
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
    <div className="relative min-h-[100dvh] w-full bg-bg text-fg font-body selection:bg-accent selection:text-accent-fg flex flex-col justify-center items-center px-4 py-8 sm:px-6">
      {/* Sovereign Sacred Geometry Backdrop & Ambient Illumination */}
      <IslamicPattern />

      {/* Main Luxury Showcase Card */}
      <div className="relative z-10 w-full max-w-xl surface-card p-6 sm:p-10 rounded-2xl border border-line shadow-2xl backdrop-blur-md overflow-hidden flex flex-col justify-between">
        {/* Golden Hairline Top Accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-85" />

        {/* Card Header: Stepper Progress & Skip */}
        <div className="flex items-center justify-between pb-6 border-b border-line/60">
          <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of ${total}`}>
            {Array.from({ length: total }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  index === step
                    ? 'w-10 bg-gradient-to-r from-[#B88E3E] to-[#D4AF37] shadow-sm'
                    : index < step
                      ? 'w-4 bg-[#B88E3E]/60 dark:bg-[#D4AF37]/60'
                      : 'w-3 bg-line/80',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => (isGuest ? void finishGuest(false) : next())}
            className="text-xs font-semibold text-muted hover:text-fg transition-colors px-2.5 py-1 rounded hover:bg-surface2"
          >
            {t('onboarding2.skip')}
          </button>
        </div>

        {/* Content Arena */}
        <div className="py-6 sm:py-8 flex flex-col items-center text-center">
          {isSlides ? (
            <div className="flex flex-col items-center w-full">
              {/* Pillar Badge */}
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#B88E3E]/30 bg-[#B88E3E]/10 px-3 py-1 text-xs font-semibold text-[#B88E3E] dark:text-[#D4AF37]">
                <span>{slides[step].pillar}</span>
              </div>

              {/* Handcrafted Sovereign Emblem Showcase */}
              <div className="my-3 relative flex items-center justify-center">
                {slides[step].art}
              </div>

              {/* Title & Body */}
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-fg mt-4">
                {slides[step].title}
              </h1>
              <p className="mt-3 max-w-[42ch] text-sm sm:text-base leading-relaxed text-muted">
                {slides[step].body}
              </p>
            </div>
          ) : (
            /* Step 4: Data Governance & Privacy Consent */
            <div className="w-full text-start space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#B88E3E]/30 bg-[#B88E3E]/10 text-[#B88E3E] dark:text-[#D4AF37]">
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-fg">
                    {t('onboarding2.consentTitle')}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted">
                    {t('onboarding2.consentBody')}
                  </p>
                </div>
              </div>

              {/* Privacy Guarantees Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-line bg-surface2/60 flex items-start gap-2.5">
                  <Lock className="h-4 w-4 text-[#B88E3E] dark:text-[#D4AF37] shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-muted leading-snug">
                    {i18n.language === 'ar'
                      ? 'تشفير كامل للبيانات ولا مشاركة مع أي جهة خارجية.'
                      : i18n.language === 'ru'
                        ? '100% сквозное шифрование, без передачи третьим лицам.'
                        : '100% end-to-end encryption, zero third-party selling.'}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-line bg-surface2/60 flex items-start gap-2.5">
                  <Database className="h-4 w-4 text-[#B88E3E] dark:text-[#D4AF37] shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-muted leading-snug">
                    {i18n.language === 'ar'
                      ? 'تخزين آمن ومحمي خاضع لسيطرتك الكاملة.'
                      : i18n.language === 'ru'
                        ? 'Локальное и защищенное хранение под вашим контролем.'
                        : 'Secure storage strictly under your sovereign control.'}
                  </p>
                </div>
              </div>

              {isGuest ? (
                <div className="space-y-3 pt-4 border-t border-line/60">
                  <div className="rounded-lg border border-line bg-surface2/50 p-3 text-xs text-muted leading-relaxed">
                    {t('guest.localOnly')}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      fullWidth
                      size="lg"
                      loading={busy}
                      onClick={() => void finishGuest(true)}
                      className="bg-[#164E3F] hover:bg-[#1D5E4C] text-white border border-[#277D64]/30"
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
                <div className="space-y-4 pt-4 border-t border-line/60">
                  <div className="space-y-3">
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
                    <button
                      type="button"
                      disabled={!consent || busy}
                      onClick={() => void finishUser()}
                      className={cn(
                        'w-full inline-flex items-center justify-center gap-2 rounded-lg font-bold px-6 py-3.5 text-sm shadow-md transition-all active:scale-[0.99] border',
                        consent
                          ? 'bg-[#164E3F] hover:bg-[#1D5E4C] text-white border-[#277D64]/40 cursor-pointer'
                          : 'bg-surface2 text-muted border-line cursor-not-allowed opacity-60',
                      )}
                    >
                      <Check className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
                      <span>{busy ? t('common.loading') : t('consent.accept')}</span>
                    </button>
                    {!consent ? (
                      <p className="text-center text-[11px] text-[#B88E3E] dark:text-[#D4AF37] font-semibold mt-2">
                        {t('consent.mustAccept')}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        {isSlides && (
          <div className="pt-6 border-t border-line/60 flex items-center justify-between gap-4">
            {step > 0 ? (
              <button
                type="button"
                onClick={prev}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-muted hover:text-fg transition-colors rounded-lg hover:bg-surface2"
              >
                <ArrowLeft className="flip-rtl h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('common.back')}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={next}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#164E3F] hover:bg-[#1D5E4C] text-white font-bold px-6 py-3 text-sm shadow-md transition-all active:scale-[0.99] border border-[#277D64]/40"
            >
              <span>{t('onboarding2.next')}</span>
              <ArrowRight className="flip-rtl h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
