/**
 * The Verdict Moment: Architectural evaluation stamp, verified reason, and consultative discussion.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  HelpCircle,
  Stethoscope,
  BookmarkCheck,
  Bookmark,
  Camera,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { HalalResult, Verdict } from '../../shared/types';
import { SheikhAvatar } from './characters/Personas';
import { RichText } from './RichText';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Feedback';
import { cn } from './ui';
import { bloom, shake, stamp, prefersReducedMotion } from '../lib/motion';
import { haptic, HAPTIC } from '../lib/haptics';

const STYLES: Record<Verdict, { ring: string; icon: typeof ShieldCheck; tone: 'ok' | 'danger' | 'warn' | 'neutral' }> = {
  halal: { ring: 'bg-ok text-ok-fg', icon: ShieldCheck, tone: 'ok' },
  haram: { ring: 'bg-danger text-danger-fg', icon: ShieldAlert, tone: 'danger' },
  mashbooh: { ring: 'bg-warn text-warn-fg', icon: ShieldQuestion, tone: 'warn' },
  inconclusive: { ring: 'bg-surface2 text-muted border border-line', icon: HelpCircle, tone: 'neutral' },
};

export function VerdictCard({
  result,
  imageUrl,
  onDiscuss,
  onDoctorCheck,
  onSave,
  onRescan,
  discussing,
  saved = false,
}: {
  result: HalalResult;
  imageUrl?: string | null;
  onDiscuss: () => void;
  onDoctorCheck?: () => void;
  onSave?: () => void;
  onRescan?: () => void;
  discussing: boolean;
  saved?: boolean;
}) {
  const { t } = useTranslation();
  const badgeRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [reasonShown, setReasonShown] = useState(prefersReducedMotion() ? result.reason.length : 0);
  const style = STYLES[result.verdict] ?? STYLES.inconclusive;
  const Icon = style.icon;

  const isNutritionOnly =
    result.verdict === 'inconclusive' &&
    (result.reason.includes('الحقائق الغذائية') ||
      result.reason.toLowerCase().includes('nutrition') ||
      result.needed.some((n) => n.includes('المكونات') || n.toLowerCase().includes('ingredients')));

  useEffect(() => {
    if (result.verdict === 'halal') {
      bloom(badgeRef.current);
      haptic(HAPTIC.success);
    } else if (result.verdict === 'haram') {
      stamp(badgeRef.current);
      shake(cardRef.current);
      haptic(HAPTIC.danger);
    } else if (result.verdict === 'mashbooh') {
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
    <div ref={cardRef} className="space-y-4">
      {/* Nutrition Facts Only Warning Banner if applicable */}
      {isNutritionOnly && (
        <div className="surface-card border-warn/30 bg-warn/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-warn shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-fg">
              {t('halal.nutritionOnly', 'الصورة تحتوي الحقائق الغذائية فقط، صوّر قائمة المكوّنات')}
            </p>
          </div>
          {onRescan && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRescan}
              icon={<Camera className="h-4 w-4" />}
              className="shrink-0"
            >
              {t('halal.rescanIngredients', 'صوّر قائمة المكوّنات')}
            </Button>
          )}
        </div>
      )}

      {/* Main Verdict Card */}
      <div className="surface-card p-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <SheikhAvatar size="lg" />
            <div
              ref={badgeRef}
              className={cn(
                'absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full shadow-xs',
                style.ring
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-muted">مساعد الحلال</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold text-accent border border-accent/20">
                <Sparkles className="h-2 w-2" />
                <span>ذكاء اصطناعي</span>
              </span>
            </div>
            <p className="font-display text-2xl font-bold leading-tight text-fg">
              {t(`halal.verdict.${result.verdict}`)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge tone={style.tone}>
                {t('halal.confidence', { value: Math.round(result.confidence * 100) })}
              </StatusBadge>
              {result.cached ? <StatusBadge tone="neutral">{t('halal.cached')}</StatusBadge> : null}
            </div>
          </div>
        </div>

        {result.product ? (
          <p className="mt-4 text-base font-bold text-fg">
            <bdi dir="auto">{result.product}</bdi>
          </p>
        ) : null}

        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="mt-3.5 max-h-52 w-full rounded-md object-cover border border-line"
            loading="lazy"
          />
        ) : null}

        <div className="mt-3.5 text-sm leading-relaxed text-fg">
          {reasonShown < result.reason.length ? (
            <p className="whitespace-pre-wrap">
              <bdi dir="auto">{result.reason.slice(0, reasonShown)}</bdi>
              <span className="text-accent animate-pulse">▍</span>
            </p>
          ) : (
            <RichText text={result.reason} />
          )}
        </div>
      </div>

      {/* Ingredients List */}
      {result.ingredients.length > 0 && (
        <div className="surface-card p-4">
          <p className="text-xs font-bold text-muted mb-2">
            {t('home.ingredientsCount', { count: result.ingredients.length })}
          </p>
          <ul className="divide-y divide-line max-h-60 overflow-y-auto pe-1">
            {result.ingredients.slice(0, 40).map((ingredient, index) => (
              <li
                key={`${ingredient.name}-${index}`}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1 leading-snug">
                  <bdi dir="auto">{ingredient.name}</bdi>
                </span>
                <StatusBadge
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
                </StatusBadge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Doubts / Concerns */}
      {result.concerns.length > 0 && (
        <div className="surface-card p-4">
          <p className="text-xs font-bold text-muted mb-2">{t('halal.concerns')}</p>
          <ul className="space-y-1.5 text-sm leading-snug text-fg">
            {result.concerns.map((concern) => (
              <li key={concern} className="flex items-start gap-2">
                <span className="text-warn mt-0.5">•</span>
                <bdi dir="auto">{concern}</bdi>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Needed to Confirm */}
      {result.needed.length > 0 && (
        <div className="surface-card border-dashed p-4">
          <p className="text-xs font-bold text-muted mb-2">{t('halal.needed')}</p>
          <ul className="space-y-1.5 text-sm leading-snug text-fg">
            {result.needed.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-ok mt-0.5">✓</span>
                <bdi dir="auto">{item}</bdi>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons: Ask in chat, Check medically, Save */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        <Button
          fullWidth
          variant="primary"
          size="md"
          loading={discussing}
          onClick={onDiscuss}
          icon={<MessageCircle className="h-4 w-4" aria-hidden />}
        >
          {t('halal.discuss', 'اسأل عن النتيجة')}
        </Button>

        {onDoctorCheck && (
          <Button
            fullWidth
            variant="secondary"
            size="md"
            onClick={onDoctorCheck}
            icon={<Stethoscope className="h-4 w-4" aria-hidden />}
          >
            {t('halal.doctorCheck', 'افحص صحياً')}
          </Button>
        )}

        {onSave && (
          <Button
            fullWidth
            variant="secondary"
            size="md"
            onClick={onSave}
            icon={
              saved ? (
                <BookmarkCheck className="h-4 w-4 text-ok" aria-hidden />
              ) : (
                <Bookmark className="h-4 w-4" aria-hidden />
              )
            }
          >
            {saved ? t('halal.saved', 'تم الحفظ') : t('halal.save', 'حفظ')}
          </Button>
        )}
      </div>
    </div>
  );
}
