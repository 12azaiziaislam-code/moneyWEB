/** Halal home: the Sheikh, one big scan button, a calm scan state and the verdict. */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Image as ImageIcon, Type, X } from 'lucide-react';
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
    <div className="flex flex-1 flex-col gap-3 pb-4">
      <PageHeader title={t('home.salam')} subtitle={t('home.salamSub')} />

      {!result && !busy ? (
        <div className="surface-card relative overflow-hidden px-4 pb-5 pt-3">
          <div className="pointer-events-none absolute -end-4 -top-4" aria-hidden="true">
            <Sheikh size={96} />
          </div>

          <div className="relative mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="relative flex h-32 w-32 items-center justify-center rounded-full bg-accent text-accent-fg shadow-e3 transition-transform duration-200 active:scale-95"
              aria-label={t('home.cta')}
            >
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-accent opacity-30" aria-hidden="true" />
              <Camera className="h-10 w-10" strokeWidth={2} aria-hidden />
            </button>
            <p className="text-[13px] font-bold">{t('home.cta')}</p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Chip onClick={() => galleryRef.current?.click()}>
                <ImageIcon className="me-1 inline h-3.5 w-3.5" aria-hidden /> {t('common.gallery')}
              </Chip>
              <Chip active={typing} onClick={() => setTyping((value) => !value)}>
                <Type className="me-1 inline h-3.5 w-3.5" aria-hidden /> {t('home.orText')}
              </Chip>
            </div>

            {image ? (
              <div className="relative w-full">
                <img src={image.dataUrl} alt="" className="max-h-40 w-full rounded-md object-cover" />
                <IconButton
                  label={t('common.clear')}
                  onClick={() => setImage(null)}
                  className="absolute end-1 top-1 bg-black/50 text-white"
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

      {image || typing ? (
        <Button fullWidth size="lg" loading={busy} onClick={() => void scan()}>
          {busy ? t('halal.scanning') : t('halal.scan')}
        </Button>
      ) : null}

      {busy ? (
        <div className="surface-card space-y-3 p-3">
          <div className="relative overflow-hidden rounded-md bg-surface2">
            {image ? <img src={image.dataUrl} alt="" className="max-h-52 w-full object-cover opacity-80" /> : null}
            <div className="absolute inset-x-0 top-0 h-14 animate-float bg-gradient-to-b from-transparent via-[var(--accent)]/35 to-transparent" />
          </div>
          <p className="text-center text-[13px] font-semibold text-accent">{t(`home.phrases.p${phrase + 1}`)}</p>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : null}

      {result ? (
        <>
          <VerdictCard
            result={result}
            imageUrl={image?.dataUrl ?? null}
            onDiscuss={() => void discuss()}
            discussing={discussing}
          />
          <Button variant="secondary" fullWidth onClick={reset}>
            {t('halal.newScan')}
          </Button>
        </>
      ) : null}

      <Disclaimer>{t('halal.disclaimer')}</Disclaimer>
    </div>
  );
}
