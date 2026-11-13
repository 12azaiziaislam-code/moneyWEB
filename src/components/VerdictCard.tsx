/** The verdict moment: bloom / stamp / swing, then the reason and the objection CTA. */

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
  halal: { ring: 'bg-risk-green text-risk-greenFg', icon: ShieldCheck, tone: 'ok' },
  haram: { ring: 'bg-risk-red text-risk-redFg', icon: ShieldAlert, tone: 'danger' },
  mashbooh: { ring: 'bg-risk-yellow text-risk-yellowFg', icon: ShieldQuestion, tone: 'warn' },
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
      <div className="surface-card p-4">
        <div className="flex items-center gap-3">
          <div ref={badgeRef} className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl', style.ring)}>
            <Icon className="h-8 w-8" strokeWidth={2.2} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('home.verdictTitle')}</p>
            <p className="text-display text-[22px] font-extrabold leading-tight">{t(`halal.verdict.${result.verdict}`)}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone={style.tone}>{t('halal.confidence', { value: Math.round(result.confidence * 100) })}</Badge>
              {result.cached ? <Badge tone="neutral">{t('halal.cached')}</Badge> : null}
            </div>
          </div>
        </div>

        {result.product ? <p className="mt-3 text-sm font-bold">{result.product}</p> : null}
        {imageUrl ? <img src={imageUrl} alt="" className="mt-3 max-h-40 w-full rounded-md object-cover" loading="lazy" /> : null}

        <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed">
          {result.reason.slice(0, reasonShown)}
          {reasonShown < result.reason.length ? <span className="animate-pulse">▍</span> : null}
        </p>
      </div>

      {result.ingredients.length ? (
        <div className="surface-card p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            {t('home.ingredientsCount', { count: result.ingredients.length })}
          </p>
          <ul className="mt-1 max-h-56 divide-y divide-line overflow-y-auto pe-1">
            {result.ingredients.slice(0, 40).map((ingredient, index) => (
              <li key={`${ingredient.name}-${index}`} className="flex items-start justify-between gap-2 py-1.5 text-[13px]">
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
        <div className="surface-card p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{t('halal.concerns')}</p>
          <ul className="mt-1 space-y-1 text-[13px] leading-snug">
            {result.concerns.map((concern) => (
              <li key={concern}>• {concern}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.needed.length ? (
        <div className="surface-card border-dashed p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{t('halal.needed')}</p>
          <ul className="mt-1 space-y-1 text-[13px] leading-snug">
            {result.needed.map((item) => (
              <li key={item}>✓ {item}</li>
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
