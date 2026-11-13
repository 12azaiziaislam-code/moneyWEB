/**
 * Baraka v2 — Dietary & Health Guidance Desk
 * Health Profile integration, Medication & Dietary Risk Analysis, Emergency 112 Protocol.
 */

import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Phone, X, ShieldAlert, Activity, Sparkles, CheckCircle2 } from 'lucide-react';
import { bmi, isEmergencyText, isHealthProfileComplete } from '../../shared/health';
import { PageHeader } from '../components/AppShell';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, Disclaimer, Skeleton } from '../components/ui/Feedback';
import { Textarea } from '../components/ui/Field';
import { prepareImage } from '../lib/image';
import { useAuth } from '../state/AuthContext';
import { useFinance } from '../data/finance';
import { useChatMutations } from '../data/chats';
import { useDoctorScan } from '../state/DoctorScanContext';
import { useToast } from '../state/ToastContext';
import { usePageTheme } from '../lib/theme';

export function DoctorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { role } = useAuth();
  const { health } = useFinance();
  const { createChat } = useChatMutations();
  usePageTheme('doctor');

  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persistent global doctor scan state across page transitions
  const {
    image,
    setImage,
    text,
    setText,
    busy,
    result,
    runAnalysis,
  } = useDoctorScan();

  const profileReady = useMemo(() => isHealthProfileComplete(health), [health]);
  const hasContent = Boolean(image || text.trim().length >= 3);
  const emergency = Boolean(result?.emergency) || isEmergencyText(text);

  const analyze = async () => {
    if (!profileReady) {
      show('يرجى إكمال ملفك الصحي أولاً لمطابقة الدواء لحالتك وتفادي أي أخطار', 'warning');
      navigate('/profile');
      return;
    }
    if (!hasContent) {
      show('يرجى كتابة اسم الدواء أو التقاط صورة لعلبته أولاً للبدء', 'info');
      textareaRef.current?.focus();
      return;
    }
    const outcome = await runAnalysis(image, text, profileReady);
    if (outcome && outcome.redirect) {
      navigate(outcome.redirect);
    }
  };

  const discuss = async () => {
    if (role === 'guest') {
      show(t('guest.aiRequiresAuth'), 'warning');
      return;
    }
    if (!result) return;
    const isRu = i18n.language.startsWith('ru');
    const isEn = i18n.language.startsWith('en');
    const typeLabel =
      result.medicine?.name ||
      t(`doctor.types.${result.type}`, isRu ? 'Консультация' : isEn ? 'Health Consultation' : 'استشارة وتقييم صحي');
    const seed = isRu
      ? [
          `🩺 **Медицинская консультация:** ${typeLabel}`,
          `• **Сводка анализа:** ${result.summary}`,
        ].join('\n\n')
      : isEn
        ? [
            `🩺 **Health Consultation:** ${typeLabel}`,
            `• **Clinical Summary:** ${result.summary}`,
          ].join('\n\n')
        : [
            `🩺 **استشارة طبية وصحية:** ${typeLabel}`,
            `• **ملخص التقييم:** ${result.summary}`,
          ].join('\n\n');
    const chatTitle = result.medicine?.name || typeLabel;
    const chat = await createChat({ kind: 'doctor', title: chatTitle, seedText: seed });
    if (chat) navigate(`/chats/${chat.id}`);
  };

  const calculatedBmi = health.weightKg && health.heightCm ? bmi(health.weightKg, health.heightCm) : null;

  return (
    <div className="flex flex-1 flex-col gap-5 pb-8">
      <PageHeader title={t('doctor.title')} subtitle={t('doctor.subtitle')} />

      {/* 1. HEALTH PROFILE STATUS CARD (No empty dashes) */}
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-e1">
        {profileReady ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Activity className="h-6 w-6" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-bold text-fg">{t('doctorCard.title')}</p>
                  <Badge tone="ok">{t('doctorCard.complete')}</Badge>
                </div>
                <p className="num text-xs sm:text-sm font-semibold text-muted mt-0.5">
                  {health.age} سنة · {health.weightKg} كغ · كتلة الجسم {calculatedBmi}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/profile')}>
              {t('doctorCard.edit')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn">
                <Activity className="h-6 w-6" strokeWidth={2} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-bold text-fg">{t('doctorCard.title')}</p>
                  <Badge tone="warn">{t('doctorCard.incomplete')}</Badge>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {t('doctorCard.incompleteTip')}
                </p>
              </div>
            </div>
            <Button size="sm" variant="gold" onClick={() => navigate('/profile')} className="shrink-0 w-full sm:w-auto">
              {t('doctorCard.edit')}
            </Button>
          </div>
        )}
      </div>

      {/* 2. EMERGENCY RED PROTOCOL BANNER (If triggered) */}
      {emergency ? (
        <div className="rounded-xl border border-danger/40 bg-danger-soft/60 p-4 text-danger space-y-3 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 font-display text-base font-bold">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{t('doctor.emergency')}</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-fg font-medium">
            {t('doctor.emergencyBody')}
          </p>
          <a
            href="tel:112"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-danger px-5 text-sm font-bold text-white shadow-e1 hover:opacity-95 cursor-pointer w-full sm:w-auto"
          >
            <Phone className="h-4 w-4" aria-hidden />
            <span>{t('doctor.call112')}</span>
          </a>
        </div>
      ) : null}

      {/* 3. ANALYSIS WORKSPACE */}
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-e1">
        {image ? (
          <div className="relative rounded-xl border border-line overflow-hidden bg-surface2 max-w-md mx-auto">
            <img src={image.dataUrl} alt="" className="max-h-56 w-full object-contain" />
            <IconButton
              label={t('common.clear')}
              onClick={() => setImage(null)}
              className="absolute end-2 top-2 bg-black/70 text-white hover:bg-black"
            >
              <X className="h-4 w-4" aria-hidden />
            </IconButton>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[110px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface2/60 text-muted hover:text-fg hover:border-accent/40 transition-colors cursor-pointer"
          >
            <Camera className="h-7 w-7 text-accent" strokeWidth={1.8} aria-hidden />
            <span className="text-xs sm:text-sm font-bold">{t('common.camera')}</span>
          </button>
        )}

        {/* Textarea with Distinct Non-Duplicated Label */}
        <div className="space-y-1.5">
          <Textarea
            ref={textareaRef}
            label="تفاصيل الاستفسار أو اسم الدواء والمكونات"
            placeholder="اكتب اسم الدواء، الأعراض، أو ألصق النشرة الطبية للتحقق منها..."
            value={text}
            maxLength={4000}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        {/* Clear Action Button: Always Active, High Contrast & Intelligent Guidance */}
        <div className="pt-2">
          <Button
            fullWidth
            size="lg"
            variant="primary"
            loading={busy}
            disabled={busy}
            onClick={() => void analyze()}
            icon={hasContent ? <CheckCircle2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          >
            {busy
              ? image
                ? t('doctor.analyzingImage')
                : t('doctor.analyzingText')
              : !profileReady
                ? 'إكمال الملف الصحي لبدء الفحص'
                : hasContent
                  ? 'بدء الفحص الصحي الفوري الآن'
                  : 'بدء الفحص الصحي'}
          </Button>

          {/* Contextual guidance indicator under the button */}
          {!profileReady ? (
            <p className="mt-2 text-center text-xs text-warn font-semibold">
              يرجى إكمال معلومات الطول والوزن والأدوية في ملفك الصحي أعلاه أولاً
            </p>
          ) : !hasContent ? (
            <p className="mt-2 text-center text-xs text-muted leading-relaxed">
              التقط صورة لعلبة الدواء أو اكتب اسمه والأعراض أعلاه لبدء الفحص ومطابقته مع ملفك
            </p>
          ) : (
            <p className="mt-2 text-center text-xs text-accent font-semibold">
              جاهز للفحص ومطابقة الأعراض مع ملفك الطبي فوراً
            </p>
          )}
        </div>

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

      {/* Analysis Loading Skeleton */}
      {busy ? (
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-3 shadow-e1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {/* 4. RESULT CARD MOMENT */}
      {result ? (
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-e2">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">نتيجة التقييم الصحي</p>
              <h3 className="font-display text-lg sm:text-xl font-bold text-fg pt-0.5">
                {result.medicine?.name || t(`doctor.types.${result.type}`, 'استشارة وتقييم صحي')}
              </h3>
            </div>
            <Button size="sm" variant="gold" onClick={() => void discuss()}>
              {t('doctor.discuss')}
            </Button>
          </div>
          <p className="text-sm leading-relaxed text-fg whitespace-pre-wrap font-normal">{result.summary}</p>
        </div>
      ) : null}

      {/* Result-Time High Contrast Visible Disclaimer */}
      <Disclaimer>{t('doctor.disclaimer')}</Disclaimer>
    </div>
  );
}
