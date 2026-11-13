/**
 * The Verdict Moment: Architectural evaluation stamp, verified reason, and consultative discussion.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { HalalResult, Verdict } from '../../shared/types';
import { Button } from './ui/Button';
import { Badge } from './ui/Feedback';
import { cn } from './ui';
import { bloom, shake, stamp, prefersReducedMotion } from '../lib/motion';
import { haptic, HAPTIC } from '../lib/haptics';

const STYLES: Record<Verdict, { ring: string; icon: typeof ShieldCheck; tone: 'ok' | 'danger' | 'warn' }> = {
  halal: { ring: 'bg-ok text-ok-fg', icon: ShieldCheck, tone: 'ok' },
  haram: { ring: 'bg-danger text-danger-fg', icon: ShieldAlert, tone: 'danger' },
  mashbooh: { ring: 'bg-warn text-warn-fg', icon: ShieldQuestion, tone: 'warn' },
};

export function VerdictCard({
  result,
  imageUrl,
  onDiscuss,
  discussing,
}: {
  result: HalalResult;
  imageUrl?: string | null;
  onDiscuss: () => void;
  discussing: boolean;
}) {
  const { t } = useTranslation();
  const badgeRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [reasonShown, setReasonShown] = useState(prefersReducedMotion() ? result.reason.length : 0);
  const style = STYLES[result.verdict];
  const Icon = style.icon;

  useEffect(() => {
    if (result.verdict === 'halal') {
      bloom(badgeRef.current);
      haptic(HAPTIC.success);
    } else if (result.verdict === 'haram') {
      stamp(badgeRef.current);
      shake(cardRef.current);
      haptic(HAPTIC.danger);
    } else {
      bloom(badgeRef.current);
      haptic(HAPTIC.warning);
    }
  }, [result.id, result.verdict]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setReasonShown(result.reason.length);
      return;
    }
    setReasonShown(0);
    let index = 0;
    const timer = window.setInterval(() => {
      index += 4;
      setReasonShown(Math.min(result.reason.length, index));
      if (index >= result.reason.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [result.reason]);

  return (
    <div ref={cardRef} className="space-y-3">
      <div className="surface-card p-4 sm:p-5">
        <div className="flex items-center gap-3.5">
          <div ref={badgeRef} className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-lg shadow-sm', style.ring)}>
            <Icon className="h-7 w-7" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t('home.verdictTitle')}</p>
            <p className="text-display text-2xl font-bold leading-tight text-fg">{t(`halal.verdict.${result.verdict}`)}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone={style.tone}>{t('halal.confidence', { value: Math.round(result.confidence * 100) })}</Badge>
              {result.cached ? <Badge tone="neutral">{t('halal.cached')}</Badge> : null}
            </div>
          </div>
        </div>

        {result.product ? <p className="mt-3 text-sm font-bold text-fg">{result.product}</p> : null}
        {imageUrl ? <img src={imageUrl} alt="" className="mt-3 max-h-48 w-full rounded-md object-cover border border-line" loading="lazy" /> : null}

        <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-fg">
          {result.reason.slice(0, reasonShown)}
          {reasonShown < result.reason.length ? <span className="text-accent animate-pulse">▍</span> : null}
        </p>
      </div>

      {result.ingredients.length ? (
        <div className="surface-card p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            {t('home.ingredientsCount', { count: result.ingredients.length })}
          </p>
          <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto pe-1">
            {result.ingredients.slice(0, 40).map((ingredient, index) => (
              <li key={`${ingredient.name}-${index}`} className="flex items-start justify-between gap-2 py-2 text-xs sm:text-[13px]">
                <span className="min-w-0 flex-1 leading-snug">{ingredient.name}</span>
                <Badge
                  tone={
                    ingredient.status === 'halal'
                      ? 'ok'
                      : ingredient.status === 'haram'
                        ? 'danger'
                        : ingredient.status === 'mashbooh'
                          ? 'warn'
                          : 'neutral'
                  }
                >
                  {ingredient.status === 'unknown' ? '?' : t(`halal.verdict.${ingredient.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.concerns.length ? (
        <div className="surface-card p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{t('halal.concerns')}</p>
          <ul className="mt-1.5 space-y-1 text-xs sm:text-[13px] leading-snug text-fg">
            {result.concerns.map((concern) => (
              <li key={concern} className="flex items-start gap-1.5">
                <span className="text-warn mt-0.5">•</span>
                <span>{concern}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.needed.length ? (
        <div className="surface-card border-dashed p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{t('halal.needed')}</p>
          <ul className="mt-1.5 space-y-1 text-xs sm:text-[13px] leading-snug text-fg">
            {result.needed.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <span className="text-ok mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button
        fullWidth
        variant="gold"
        size="lg"
        loading={discussing}
        onClick={onDiscuss}
        icon={<MessageCircle className="h-4 w-4" aria-hidden />}
      >
        {t('halal.discuss')}
      </Button>
    </div>
  );
}
