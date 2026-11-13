/**
 * Halal Verification Desk: Camera, Gallery upload, Text entry, and Verdict Card.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Image as ImageIcon, Type, X, RefreshCw } from 'lucide-react';
import type { HalalResult } from '../../shared/types';
import { PageHeader } from '../components/AppShell';
import { VerdictCard } from '../components/VerdictCard';
import { Sheikh } from '../components/characters/Sheikh';
import { Button, IconButton } from '../components/ui/Button';
import { Chip, Disclaimer, Skeleton } from '../components/ui/Feedback';
import { Textarea } from '../components/ui/Field';
import { ApiError, apiFetch } from '../lib/api';
import { prepareImage, type PreparedImage } from '../lib/image';
import { CacheKeys, idbGet, idbSet } from '../lib/idb';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { usePageTheme } from '../lib/theme';
import { useChatMutations } from '../data/chats';
import { haptic, HAPTIC } from '../lib/haptics';

export function HalalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { role, user } = useAuth();
  const { createChat } = useChatMutations();
  usePageTheme('halal');

  const isGuest = role === 'guest';
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<PreparedImage | null>(null);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HalalResult | null>(null);
  const [discussing, setDiscussing] = useState(false);
  const [phrase, setPhrase] = useState(0);

  useEffect(() => {
    void idbGet<HalalResult>(CacheKeys.halalLast).then((cached) => {
      if (cached) setResult({ ...cached, cached: true });
    });
  }, []);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setPhrase((value) => (value + 1) % 4), 2600);
    return () => window.clearInterval(timer);
  }, [busy]);

  const pickFile = async (file?: File) => {
    if (!file) return;
    try {
      setImage(await prepareImage(file));
      setTyping(false);
      haptic(HAPTIC.tap);
    } catch (error) {
      const code = (error as Error).message;
      show(code === 'too_large' ? t('errors.payload_too_large') : t('errors.validation_failed'), 'danger');
    }
  };

  const scan = async () => {
    if (!image && text.trim().length < 3) {
      show(t('halal.empty'), 'warning');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { text: text.trim() || undefined, hash: image?.hash };
      if (isGuest) {
        body.imageDataUrl = image?.dataUrl;
        body.guest = { locale: user?.locale ?? 'ar', madhhab: user?.madhhab ?? 'none' };
      } else if (image) {
        const uploaded = await apiFetch<{ id: string }>('/api/uploads', {
          method: 'POST',
          body: { dataUrl: image.dataUrl, hash: image.hash },
        });
        body.assetId = uploaded.id;
      }
      const response = await apiFetch<{ result: HalalResult }>('/api/halal/scan', { method: 'POST', body });
      setResult(response.result);
      void idbSet(CacheKeys.halalLast, response.result);
    } catch (cause) {
      const key = cause instanceof ApiError ? `errors.${cause.code}` : 'errors.generic';
      show(t(key) === key ? t('errors.generic') : t(key), 'danger');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setImage(null);
    setText('');
    setResult(null);
    setTyping(false);
  };

  const discuss = async () => {
    if (!result) return;
    setDiscussing(true);
    try {
      const seed = [
        result.product ? `Product: ${result.product}` : null,
        `Verdict: ${result.verdict} (${Math.round(result.confidence * 100)}%)`,
        `Reason: ${result.reason}`,
        result.concerns.length ? `Concerns: ${result.concerns.join('; ')}` : null,
        result.needed.length ? `Needed: ${result.needed.join('; ')}` : null,
      ]
        .filter(Boolean)
        .join('\n');
      const chat = await createChat({ kind: 'shaykh', title: result.product ?? t('halal.title'), seedText: seed });
      if (chat) navigate(`/chats/${chat.id}`);
    } catch {
      show(t('errors.generic'), 'danger');
    } finally {
      setDiscussing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 pb-6">
      <PageHeader title={t('home.salam')} subtitle={t('home.salamSub')} />

      {!result && !busy ? (
        <div className="surface-card p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-4">
            <Sheikh size={64} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <h2 className="text-display text-base sm:text-lg font-bold text-fg">
                {t('landing.cap1Title')}
              </h2>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {t('landing.cap1Desc')}
              </p>
            </div>
          </div>

          <div className="border-t border-line/60 pt-4 flex flex-col items-center gap-4">
            {/* Action Triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex items-center justify-center gap-2.5 rounded-md border border-line bg-surface2 px-4 py-3.5 text-sm font-semibold text-fg hover:border-accent/40 transition-colors"
              >
                <Camera className="h-5 w-5 text-accent" strokeWidth={1.8} aria-hidden />
                <span>{t('home.cta')}</span>
              </button>

              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex items-center justify-center gap-2.5 rounded-md border border-line bg-surface2 px-4 py-3.5 text-sm font-semibold text-fg hover:border-accent/40 transition-colors"
              >
                <ImageIcon className="h-5 w-5 text-muted" strokeWidth={1.8} aria-hidden />
                <span>{t('common.gallery')}</span>
              </button>
            </div>

            <div className="flex items-center justify-center w-full">
              <Chip active={typing} onClick={() => setTyping((value) => !value)}>
                <Type className="me-1 inline h-3.5 w-3.5" aria-hidden /> {t('home.orText')}
              </Chip>
            </div>

            {image ? (
              <div className="relative w-full rounded-md border border-line overflow-hidden bg-surface2">
                <img src={image.dataUrl} alt="" className="max-h-56 w-full object-contain" />
                <IconButton
                  label={t('common.clear')}
                  onClick={() => setImage(null)}
                  className="absolute end-2 top-2 bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" aria-hidden />
                </IconButton>
              </div>
            ) : null}

            {typing ? (
              <div className="w-full">
                <Textarea
                  label={t('halal.placeholder')}
                  value={text}
                  maxLength={4000}
                  onChange={(event) => setText(event.target.value)}
                />
              </div>
            ) : null}

            {image || typing ? (
              <Button fullWidth size="lg" loading={busy} onClick={() => void scan()} className="h-11 mt-1">
                {t('halal.scan')}
              </Button>
            ) : null}
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => void pickFile(event.target.files?.[0])}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(event) => void pickFile(event.target.files?.[0])}
          />
        </div>
      ) : null}

      {busy ? (
        <div className="surface-card space-y-4 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-line bg-surface2 text-accent">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-accent">{t(`home.phrases.p${phrase + 1}`)}</p>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <VerdictCard
            result={result}
            imageUrl={image?.dataUrl ?? null}
            onDiscuss={() => void discuss()}
            discussing={discussing}
          />
          <Button variant="secondary" fullWidth onClick={reset} className="h-11">
            {t('halal.newScan')}
          </Button>
        </div>
      ) : null}

      <Disclaimer>{t('halal.disclaimer')}</Disclaimer>
    </div>
  );
}
