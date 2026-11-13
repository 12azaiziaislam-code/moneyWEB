/**
 * Splash Screen: Clean, serene brand mark presentation.
 */

import { useTranslation } from 'react-i18next';
import { Logo } from './characters/Logo';

export function Splash({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-bg text-fg" data-theme="halal">
      <div className="p-3 rounded-xl border border-line bg-surface shadow-sm">
        <Logo size={64} />
      </div>
      <div className="text-center space-y-1">
        <p className="text-display text-2xl font-bold tracking-tight text-fg">{t('app.name')}</p>
        <p className="text-xs text-muted">{label ?? t('app.tagline')}</p>
      </div>
    </div>
  );
}
