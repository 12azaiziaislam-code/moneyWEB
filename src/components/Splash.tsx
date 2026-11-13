/** Animated splash: the brand mark + a calm pulse (respects reduced motion). */

import { useTranslation } from 'react-i18next';
import { Logo } from './characters/Logo';

export function Splash({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-bg" data-theme="halal">
      <div className="relative">
        <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-accent opacity-20" aria-hidden="true" />
        <div className="animate-pop">
          <Logo size={84} animated />
        </div>
      </div>
      <div className="text-center">
        <p className="text-display text-xl font-extrabold tracking-tight text-fg">{t('app.name')}</p>
        <p className="mt-1 text-[12px] text-muted">{label ?? t('app.tagline')}</p>
      </div>
    </div>
  );
}
