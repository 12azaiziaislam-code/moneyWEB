/**
 * Splash Screen: Clean, serene brand mark presentation.
 */

import { useTranslation } from 'react-i18next';
import { Logo } from './characters/Logo';

export function Splash({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-bg text-fg" data-theme="halal">
      <Logo size={72} className="rounded-2xl shadow-e2" />
      <div className="text-center space-y-1">
        <p className="font-display text-2xl font-bold text-fg">{t('app.name')}</p>
        <p className="text-xs text-muted">{label ?? t('app.tagline')}</p>
      </div>
    </div>
  );
}
