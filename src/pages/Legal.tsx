/** Privacy policy & terms (templates — review with a lawyer before launch). */

import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LEGAL } from '../content/legal';
import { useAuth } from '../state/AuthContext';
import { Card } from '../components/ui';

export function LegalPage() {
  const { doc } = useParams<{ doc: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const locale = user?.locale ?? 'en';
  const content = doc === 'terms' ? LEGAL[locale].terms : LEGAL[locale].privacy;

  return (
    <div className="flex flex-1 flex-col gap-3 pb-6">
      <div className="flex items-center gap-2 py-2">
        <Link
          to="/profile"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-2xl px-2 text-sm font-semibold text-brand-700 dark:text-brand-300"
        >
          ← {t('legal.backProfile')}
        </Link>
      </div>

      <Card className="space-y-4">
        <header>
          <h1 className="text-xl font-extrabold">{content.title}</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{content.updated}</p>
        </header>

        {content.sections.map((section) => (
          <section key={section.title} className="space-y-1.5">
            <h2 className="text-sm font-bold text-brand-800 dark:text-brand-200">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </Card>
    </div>
  );
}
