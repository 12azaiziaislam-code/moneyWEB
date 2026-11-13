/**
 * Baraka v2 — Halal Ingredient Verification Desk
 * Hero Scan Station with architectural viewfinder, instant camera/gallery upload,
 * secondary manual text entry, and contextual recent history.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Image as ImageIcon,
  Type,
  X,
  RefreshCw,
  ScanLine,
  History,
  ShieldCheck,
} from 'lucide-react';
import type { HalalResult } from '../../shared/types';
import { PageHeader } from '../components/AppShell';
import { VerdictCard } from '../components/VerdictCard';
import { Button, IconButton } from '../components/ui/Button';
import { Disclaimer, Skeleton, Badge } from '../components/ui/Feedback';
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
  const { role, signIn } = useAuth();
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
  const [lastCached, setLastCached] = useState<HalalResult | null>(null);
  const [discussing, setDiscussing] = useState(false);
  const [phrase, setPhrase] = useState(0);

  useEffect(() => {
    void idbGet<HalalResult>(CacheKeys.halalLast).then((cached) => {
      if (cached) {
        setLastCached(cached);
      }
    });
  }, []);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setPhrase((value) => (value + 1) % 4), 2400);
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
    if (isGuest) {
      show(t('guest.aiRequiresAuth'), 'warning');
      return;
    }
    if (!image && text.trim().length < 3) {
      show(t('halal.empty'), 'warning');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { text: text.trim() || undefined, hash: image?.hash };
      if (image) {
        const uploaded = await apiFetch<{ id: string }>('/api/uploads', {
          method: 'POST',
          body: { dataUrl: image.dataUrl, hash: image.hash },
        });
        body.assetId = uploaded.id;
      }
      const response = await apiFetch<{ result: HalalResult }>('/api/halal/scan', { method: 'POST', body });
      setResult(response.result);
      setLastCached(response.result);
      void idbSet(CacheKeys.halalLast, response.result);
      haptic(response.result.verdict === 'halal' ? HAPTIC.success : HAPTIC.danger);
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
    if (isGuest) {
      show(t('guest.aiRequiresAuth'), 'warning');
      return;
    }
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
    <div className="flex flex-1 flex-col gap-5 pb-8">
      <PageHeader title={t('home.salam')} subtitle={t('home.salamSub')} />

      {/* Guest Mode Advisory Banner */}
      {isGuest ? (
        <div className="rounded-xl border border-warn/30 bg-warn-soft/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-bold text-fg">{t('guest.aiRequiresAuth')}</p>
            <p className="text-xs text-muted leading-relaxed">{t('guest.localOnly')}</p>
          </div>
          <Button size="sm" variant="gold" onClick={() => void signIn()} className="shrink-0 w-full sm:w-auto">
            {t('guest.signInPrompt')}
          </Button>
        </div>
      ) : null}

      {/* 1. HERO SCAN STATION (Only shown when not reviewing a live result) */}
      {!result && !busy ? (
        <div className="space-y-4">
          <div className="relative rounded-2xl border border-line bg-surface p-5 sm:p-7 shadow-e2 overflow-hidden">
            {/* Viewfinder Target / Camera Frame */}
            <div className="relative rounded-xl border border-line/60 bg-surface2/50 p-6 flex flex-col items-center justify-center text-center gap-4 transition-all">
              {/* Corner brackets */}
              <div className="absolute top-3 start-3 h-4 w-4 border-t-2 border-s-2 border-accent" />
              <div className="absolute top-3 end-3 h-4 w-4 border-t-2 border-e-2 border-accent" />
              <div className="absolute bottom-3 start-3 h-4 w-4 border-b-2 border-s-2 border-accent" />
              <div className="absolute bottom-3 end-3 h-4 w-4 border-b-2 border-e-2 border-accent" />

              {image ? (
                <div className="relative w-full max-w-sm rounded-lg overflow-hidden border border-line bg-black/40">
                  <img src={image.dataUrl} alt="" className="max-h-64 w-full object-contain mx-auto" />
                  <IconButton
                    label={t('common.clear')}
                    onClick={() => setImage(null)}
                    className="absolute end-2 top-2 bg-black/70 text-white hover:bg-black"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </IconButton>
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-fg shadow-e1">
                    <ScanLine className="h-8 w-8" strokeWidth={1.8} />
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-fg pt-1">
                    {t('landing.cap1Title')}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted max-w-[38ch] mx-auto leading-relaxed">
                    {t('landing.cap1Desc')}
                  </p>
                </div>
              )}

              {/* Action Buttons: Camera & Gallery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md pt-2">
                <Button
                  size="lg"
                  variant="primary"
                  onClick={() => cameraRef.current?.click()}
                  icon={<Camera className="h-5 w-5" />}
                >
                  {t('home.cta')}
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => galleryRef.current?.click()}
                  icon={<ImageIcon className="h-5 w-5 text-muted" />}
                >
                  {t('common.gallery')}
                </Button>
              </div>

              {/* Text Input Toggle */}
              <button
                type="button"
                onClick={() => setTyping((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg pt-2 cursor-pointer transition-colors"
              >
                <Type className="h-3.5 w-3.5" />
                <span>{typing ? t('common.close') : t('home.orText')}</span>
              </button>
            </div>

            {/* Optional Text Entry Section */}
            {typing ? (
              <div className="mt-4 pt-4 border-t border-line/60 space-y-3">
                <Textarea
                  label={t('halal.placeholder')}
                  value={text}
                  maxLength={4000}
                  onChange={(event) => setText(event.target.value)}
                />
              </div>
            ) : null}

            {/* Execute Scan Button (When Image or Text is Ready) */}
            {(image || (typing && text.trim().length >= 3)) ? (
              <div className="mt-4 pt-3 border-t border-line/60">
                <Button
                  fullWidth
                  size="lg"
                  variant="primary"
                  loading={busy}
                  onClick={() => void scan()}
                >
                  {t('halal.scan')}
                </Button>
              </div>
            ) : null}
          </div>

          {/* Hidden File Inputs */}
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

          {/* 2. RECENT CHECKS SECTION (Eliminates dead space) */}
          {lastCached ? (
            <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-muted">
                  <History className="h-4 w-4 text-accent" />
                  <span>{t('halal.cached')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setResult(lastCached)}
                  className="text-xs font-bold text-accent hover:underline cursor-pointer"
                >
                  {t('common.all')}
                </button>
              </div>

              <div
                onClick={() => setResult(lastCached)}
                className="flex items-center justify-between p-3 rounded-lg border border-line bg-surface2/60 hover:bg-surface2 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-fg truncate">
                      {lastCached.product ?? t('halal.title')}
                    </p>
                    <p className="text-xs text-muted truncate">{lastCached.reason}</p>
                  </div>
                </div>
                <Badge tone={lastCached.verdict === 'halal' ? 'ok' : lastCached.verdict === 'haram' ? 'danger' : 'warn'}>
                  {t(`halal.verdict.${lastCached.verdict}`)}
                </Badge>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 3. ACTIVE SCANNING ANALYSIS STATE */}
      {busy ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center space-y-5 shadow-e2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-fg">
              {t(`home.phrases.p${phrase + 1}`)}
            </h3>
            <p className="text-xs text-muted">{t('common.processing')}</p>
          </div>
          <div className="space-y-2.5 max-w-sm mx-auto pt-2">
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
        </div>
      ) : null}

      {/* 4. RESULT VERDICT MOMENT */}
      {result ? (
        <div className="space-y-4">
          <VerdictCard
            result={result}
            imageUrl={image?.dataUrl ?? null}
            onDiscuss={() => void discuss()}
            discussing={discussing}
          />
          <Button variant="secondary" fullWidth size="lg" onClick={reset}>
            {t('halal.newScan')}
          </Button>
        </div>
      ) : null}

      {/* Result-Time Visible High-Contrast Disclaimer */}
      <Disclaimer>{t('halal.disclaimer')}</Disclaimer>
    </div>
  );
}
