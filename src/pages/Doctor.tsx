/**
 * Dietary & Medication Safety: Health Profile Status, Photo/Text Analysis, Emergency 112 Notice.
 */

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Phone, X, ShieldAlert } from 'lucide-react';
import type { DoctorResult } from '../../shared/types';
import { bmi, isEmergencyText, isHealthProfileComplete } from '../../shared/health';
import { PageHeader } from '../components/AppShell';
import { DoctorChar } from '../components/characters/DoctorChar';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, Disclaimer, Skeleton } from '../components/ui/Feedback';
import { Textarea } from '../components/ui/Field';
import { ApiError, apiFetch } from '../lib/api';
import { prepareImage, type PreparedImage } from '../lib/image';
import { useAuth } from '../state/AuthContext';
import { useFinance } from '../data/finance';
import { useChatMutations } from '../data/chats';
import { useToast } from '../state/ToastContext';
import { usePageTheme } from '../lib/theme';
import { haptic, HAPTIC } from '../lib/haptics';

export function DoctorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { role, signIn } = useAuth();
  const { health } = useFinance();
  const { createChat } = useChatMutations();
  usePageTheme('doctor');

  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DoctorResult | null>(null);

  const profileReady = useMemo(() => isHealthProfileComplete(health), [health]);
  const emergency = Boolean(result?.emergency) || isEmergencyText(text);

  const analyze = async () => {
    if (role === 'guest') {
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
      const response = await apiFetch<{ result: DoctorResult; redirect?: string }>('/api/doctor/analyze', {
        method: 'POST',
        body,
      });
      setResult(response.result);
      if (response.redirect) navigate(response.redirect);
      haptic(response.result.emergency ? HAPTIC.danger : HAPTIC.success);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'forbidden') show(t('doctor.profileGate'), 'warning');
      else show(t('errors.ai_unavailable'), 'danger');
    } finally {
      setBusy(false);
    }
  };

  const discuss = async () => {
    if (role === 'guest') {
      show(t('guest.aiRequiresAuth'), 'warning');
      return;
    }
    if (!result) return;
    const seed = [`Type: ${result.type}`, `Summary: ${result.summary}`].join('\n');
    const chat = await createChat({ kind: 'doctor', title: result.medicine?.name ?? result.type, seedText: seed });
    if (chat) navigate(`/chats/${chat.id}`);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 pb-6">
      <PageHeader title={t('doctor.title')} subtitle={t('doctor.subtitle')} />

      {/* Health Profile Card */}
      <div className="surface-card flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <DoctorChar size={48} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{t('doctorCard.title')}</p>
            <p className="num text-sm sm:text-base font-bold text-fg">
              {health.age ?? '—'} · {health.weightKg ?? '—'} kg · BMI {bmi(health.weightKg, health.heightCm) ?? '—'}
            </p>
            <div className="mt-1">
              <Badge tone={profileReady ? 'ok' : 'warn'}>
                {profileReady ? t('doctorCard.complete') : t('doctorCard.incomplete')}
              </Badge>
            </div>
          </div>
        </div>
        {!profileReady ? (
          <Button size="sm" variant="gold" onClick={() => navigate('/profile')}>
            {t('doctorCard.edit')}
          </Button>
        ) : null}
      </div>

      {/* Emergency Notice (If triggered) */}
      {emergency ? (
        <div className="space-y-3 rounded-lg border border-danger/40 bg-dangerSoft p-4 text-danger shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <p className="text-base font-bold">{t('doctor.emergency')}</p>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed">{t('doctor.emergencyBody')}</p>
          <a
            href="tel:112"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-danger px-4 text-sm font-bold text-white hover:opacity-90"
          >
            <Phone className="h-4 w-4" aria-hidden />
            <span>{t('doctor.call112')}</span>
          </a>
        </div>
      ) : null}

      {/* Guest notice */}
      {role === 'guest' ? (
        <div className="surface-card p-4 rounded-xl border border-[#B88E3E]/40 bg-[#B88E3E]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-start">
          <p className="text-xs sm:text-sm text-fg leading-relaxed">
            {t('guest.aiRequiresAuth')}
          </p>
          <Button size="sm" variant="gold" onClick={() => void signIn()} className="shrink-0 w-full sm:w-auto">
            {t('guest.signInPrompt')}
          </Button>
        </div>
      ) : null}

      {/* Analysis Workspace */}
      <div className="surface-card space-y-4 p-5">
        {image ? (
          <div className="relative rounded-md border border-line overflow-hidden bg-surface2">
            <img src={image.dataUrl} alt="" className="max-h-52 w-full object-contain" />
            <IconButton
              label={t('common.clear')}
              onClick={() => setImage(null)}
              className="absolute end-2 top-2 bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" aria-hidden />
            </IconButton>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[110px] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-surface2 text-muted hover:text-fg hover:border-accent/40 transition-colors"
          >
            <Camera className="h-7 w-7 text-accent" strokeWidth={1.8} aria-hidden />
            <span className="text-xs font-semibold">{t('common.camera')}</span>
          </button>
        )}

        <Textarea
          label={t('doctor.subtitle')}
          value={text}
          maxLength={4000}
          onChange={(event) => setText(event.target.value)}
        />

        <Button
          fullWidth
          size="lg"
          loading={busy}
          disabled={!profileReady}
          onClick={() => void analyze()}
          className="h-11"
        >
          {busy ? t('doctor.analyzing') : t('halal.scan')}
        </Button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) setImage(await prepareImage(file));
          }}
        />
      </div>

      {busy ? (
        <div className="surface-card p-6 space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {/* Result Display */}
      {result ? (
        <div className="surface-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{t('doctor.title')}</p>
              <h3 className="text-display text-lg font-bold text-fg">{result.type}</h3>
            </div>
            <Button size="sm" variant="gold" onClick={() => void discuss()}>
              {t('halal.discuss')}
            </Button>
          </div>
          <p className="text-sm leading-relaxed text-fg whitespace-pre-wrap">{result.summary}</p>
        </div>
      ) : null}

      <Disclaimer>{t('doctor.disclaimer')}</Disclaimer>
    </div>
  );
}
