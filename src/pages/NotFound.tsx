/**
 * 404 Not Found Page.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ErrorArt } from '../components/characters/ErrorArt';
import { Button } from '../components/ui/Button';
import { usePageTheme } from '../lib/theme';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageTheme('profile');

  return (
    <div className="flex flex-1 items-center justify-center py-12 px-4">
      <div className="surface-card flex max-w-md w-full flex-col items-center justify-center gap-4 p-8 text-center">
        <ErrorArt kind="notfound" size={96} />
        <div>
          <h1 className="text-display text-xl font-bold text-fg">{t('errors2.notFoundTitle')}</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">{t('errors2.notFoundBody')}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/')} className="mt-2">
          {t('errors2.backHome')}
        </Button>
      </div>
    </div>
  );
}
