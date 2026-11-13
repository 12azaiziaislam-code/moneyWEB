/** Doctor: health badge, photo analysis, structured result, emergency banner. */

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Phone } from 'lucide-react';
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
  const { role, user } = useAuth();
  const { health, isGuest } = useFinance();
  const { createChat } = useChatMutations();
  usePageTheme('doctor');

  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DoctorResult | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);

  const profileReady = useMemo(() => isHealthProfileComplete(health), [health]);
  const emergency = Boolean(result?.emergency) || isEmergencyText(text);

  const analyze = async () => {
    if (!image && text.trim().length < 3) {
      show(t('halal.empty'), 'warning');
      return;
    }
    setBusy(true);
    setResult(null);
    setRedirect(null);
    try {
      const body: Record<string, unknown> = { text: text.trim() || undefined, hash: image?.hash };
      if (isGuest) {
        body.imageDataUrl = image?.dataUrl;
        body.guest = { locale: user?.locale ?? 'ar', madhhab: user?.madhhab ?? 'none', health };
      } else if (image) {
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
      setRedirect(response.redirect ?? null);
      haptic(response.result.emergency ? HAPTIC.danger : HAPTIC.success);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'forbidden') show(t('doctor.profileGate'), 'warning');
      else show(t('errors.ai_unavailable'), 'danger');
    } finally {
      setBusy(false);
    }
  };

  const discuss = async () => {
    if (!result) return;
    const seed = [`Type: ${result.type}`, `Summary: ${result.summary}`].join('\n');
    const chat = await createChat({ kind: 'doctor', title: result.medicine?.name ?? result.type, seedText: seed });
    if (chat) navigate(`/chats/${chat.id}`);
  };

  return (
    <div className="flex flex-1 flex-col gap-3 pb-4">
      <PageHeader title={t('doctor.title')} subtitle={t('doctor.subtitle')} />

      <div className="surface-card flex items-center gap-3 p-3">
        <DoctorChar size={52} state={busy ? 'listening' : result ? 'done' : 'idle'} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{t('doctorCard.title')}</p>
          <p className="num text-[13px] font-semibold">
            {health.age ?? '—'} · {health.weightKg ?? '—'} kg · BMI {bmi(health.weightKg, health.heightCm) ?? '—'}
          </p>
          <div className="mt-1">
            <Badge tone={profileReady ? 'ok' : 'warn'}>
              {profileReady ? t('doctorCard.complete') : t('doctorCard.incomplete')}
            </Badge>
          </div>
        </div>
        {!profileReady ? (
          <Button size="sm" variant="gold" onClick={() => navigate('/profile')}>
            {t('doctorCard.edit')}
          </Button>
        ) : null}
      </div>

      {emergency ? (
        <div className="animate-shake space-y-2 rounded-lg bg-risk-red p-4 text-riskRedFg shadow-e2">
          <p className="text-[15px] font-extrabold">{t('doctor.emergency')}</p>
          <p className="text-[13px]">{t('doctor.emergencyBody')}</p>
          <a
            href="tel:112"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-white px-4 text-[14px] font-bold text-riskRed"
          >
            <Phone className="h-4 w-4" aria-hidden /> {t('doctor.call112')}
          </a>
        </div>
      ) : null}

      <div className="surface-card space-y-3 p-3">
        {image ? (
          <div className="relative">
            <img src={image.dataUrl} alt="" className="max-h-44 w-full rounded-md object-cover" />
            <IconButton
              label={t('common.clear')}
              onClick={() => setImage(null)}
              className="absolute end-1 top-1 bg-black/50 text-white"
            >
              ✕
            </IconButton>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[118px] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-surface2 text-accent"
          >
            <Camera className="h-8 w-8" aria-hidden />
            <span className="text-[12px] font-bold">{t('common.camera')}</span>
          </button>
        )}
        <Textarea label={t('doctor.subtitle')} value={text} maxLength={4000} onChange={(event) => setText(event.target.value)} />
        <Button fullWidth loading={busy} disabled={!profileReady} onClick={() => void analyze()}>
          {busy ? t('doctor.analyzing') : t('halal.scan')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              setImage(await prepareImage(file));
            } catch {
              show(t('errors.validation_failed'), 'danger');
            }
          }}
        />
      </div>

      {busy ? (
        <div className="surface-card space-y-2 p-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : null}

      {redirect === 'accountant' ? (
        <Button variant="soft" fullWidth onClick={() => navigate('/accountant')}>
          {t('doctor.openAccountant')}
        </Button>
      ) : null}

      {result ? (
        <div className="surface-card animate-rise space-y-2 p-3">
          <div className="flex items-center justify-between">
            <Badge tone="info">{t(`doctor.types.${result.type}`)}</Badge>
            <span className="num text-[11px] text-muted">
              {t('halal.confidence', { value: Math.round(result.confidence * 100) })}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{result.summary}</p>

          {result.medicine ? (
            <div className="space-y-1 border-t border-line pt-2">
              <p className="text-[15px] font-bold">{result.medicine.name}</p>
              <p className="text-[12px] text-muted">{result.medicine.activeIngredient}</p>
              {result.medicine.dosage ? <p className="text-[13px]">{result.medicine.dosage}</p> : null}
              {result.medicine.interactions.length ? (
                <p className="text-[12px]">
                  <strong>{t('doctor.interactions')}:</strong> {result.medicine.interactions.join(' · ')}
                </p>
              ) : null}
              {result.medicine.contraindications.length ? (
                <p className="text-[12px]">
                  <strong>{t('doctor.contraindications')}:</strong> {result.medicine.contraindications.join(' · ')}
                </p>
              ) : null}
              {result.medicine.whenToSeeDoctor.length ? (
                <p className="text-[12px]">
                  <strong>{t('doctor.whenToSee')}:</strong> {result.medicine.whenToSeeDoctor.join(' · ')}
                </p>
              ) : null}
            </div>
          ) : null}

          {result.food ? (
            <div className="space-y-2 border-t border-line pt-2">
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  [t('doctor.calories'), result.food.calories, t('units.kcal')],
                  [t('doctor.protein'), result.food.proteinG, t('units.g')],
                  [t('doctor.fat'), result.food.fatG, t('units.g')],
                  [t('doctor.carbs'), result.food.carbsG, t('units.g')],
                  [t('doctor.sugar'), result.food.sugarG, t('units.g')],
                  [t('doctor.sodium'), result.food.sodiumMg, t('units.mg')],
                ] as const).map(([label, range, unit]) => {
                  if (!range || (!range.min && !range.max)) return null;
                  return (
                    <div key={label} className="rounded-md bg-surface2 px-2 py-1.5">
                      <p className="text-[10px] text-muted">{label}</p>
                      <p className="num text-[12px] font-bold">
                        {Math.round(range.min)}–{Math.round(range.max)} {unit}
                      </p>
                    </div>
                  );
                })}
              </div>
              {result.food.exercise ? (
                <p className="text-[12px] text-muted">
                  {t('doctor.exercise')} {result.food.exercise.walkingMin} {t('common.min')}
                </p>
              ) : null}
              {result.food.suitability ? <p className="text-[13px]">{result.food.suitability}</p> : null}
            </div>
          ) : null}

          {result.lab ? (
            <div className="space-y-1 border-t border-line pt-2">
              {result.lab.values.map((value) => (
                <div key={`${value.name}-${value.value}`} className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="flex-1">{value.name}</span>
                  <span className="num font-bold">{value.value}</span>
                  <span className="num text-[11px] text-muted">{value.reference ?? ''}</span>
                </div>
              ))}
              {result.lab.note ? <p className="text-[12px] text-muted">{result.lab.note}</p> : null}
            </div>
          ) : null}

          <Button variant="secondary" fullWidth onClick={() => void discuss()}>
            {t('halal.discuss')}
          </Button>
        </div>
      ) : null}

      <Disclaimer>{t('doctor.disclaimer')}</Disclaimer>
      {role === 'guest' ? <p className="text-center text-[10px] text-muted">{t('guest.localOnly')}</p> : null}
    </div>
  );
}
