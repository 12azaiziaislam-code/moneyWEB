/**
 * Privacy Policy & Terms of Service.
 */

import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { LEGAL } from '../content/legal';
import { useAuth } from '../state/AuthContext';
import { Card } from '../components/ui';

export function LegalPage() {
  const { doc } = useParams<{ doc: string }>();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const activeLocale = (user?.locale ?? i18n.language ?? 'ar') as 'ar' | 'en' | 'ru';
  const locale = LEGAL[activeLocale] ? activeLocale : 'ar';
  const content = doc === 'terms' ? LEGAL[locale].terms : LEGAL[locale].privacy;

  return (
    <div className="flex flex-1 flex-col gap-4 pb-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-2 pt-2">
        <Link
          to="/profile"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-accent hover:bg-surface2 transition-colors"
        >
          <ChevronLeft className="flip-rtl h-4 w-4" aria-hidden />
          <span>{t('legal.backProfile')}</span>
        </Link>
      </div>

      <Card className="surface-card space-y-6 p-6 sm:p-8">
        <header className="border-b border-line pb-4">
          <h1 className="text-display text-2xl font-bold text-fg">{content.title}</h1>
          <p className="mt-1 text-xs text-muted">{content.updated}</p>
        </header>

        {content.sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-display text-base font-bold text-fg">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </Card>
    </div>
  );
}
