/** 404 with a friendly character. */

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
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
      <ErrorArt kind="notfound" size={140} />
      <h1 className="text-display text-[20px] font-extrabold">{t('errors2.notFoundTitle')}</h1>
      <p className="max-w-[30ch] text-[13px] text-muted">{t('errors2.notFoundBody')}</p>
      <Button variant="secondary" onClick={() => navigate('/')}>
        {t('errors2.backHome')}
      </Button>
    </div>
  );
}
