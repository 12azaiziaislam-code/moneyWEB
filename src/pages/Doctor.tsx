/**
 * Baraka v2 — Medical & Health Consultation Desk (الطبيب)
 * Single responsibility: Health compatibility of medications, food, and lab tests for the user.
 * No Islamic fiqh rulings here.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Image as ImageIcon,
  Phone,
  X,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  MessagesSquare,
  History,
  Pill,
  Compass,
  Stethoscope,
} from 'lucide-react';
import type { DoctorResult } from '../../shared/types';
import { bmi, isEmergencyText, isHealthProfileComplete } from '../../shared/health';
import { PageHeader } from '../components/AppShell';
import { DoctorAvatar } from '../components/characters/Personas';
import { RichText } from '../components/RichText';
import { Button, IconButton } from '../components/ui/Button';
import { Disclaimer, StatusBadge, Badge, Skeleton } from '../components/ui/Feedback';
import { Textarea } from '../components/ui/Field';
import { prepareImage } from '../lib/image';
import { useFinance } from '../data/finance';
import { useChatMutations } from '../data/chats';
import { useDoctorScan } from '../state/DoctorScanContext';
import { useScan } from '../state/ScanContext';
import { useToast } from '../state/ToastContext';
import { usePageTheme } from '../lib/theme';
import { formatCalendarDate } from '../lib/format';
import { haptic, HAPTIC } from '../lib/haptics';
import { idbGet, idbSet } from '../lib/idb';

const DOCTOR_HISTORY_KEY = 'doctor.history.v2';

interface ClinicalSection {
  title: string;
  content: string;
}

function parseClinicalSections(rawText: string): ClinicalSection[] {
  const sections: ClinicalSection[] = [];
  const regex = /\*\*([^*:\n]+):\*\*([\s\S]*?)(?=(?:\n\s*\*\*[^*:\n]+:\*\*|$))/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    sections.push({
      title: match[1].trim(),
      content: match[2].trim(),
    });
  }
  return sections;
}

function SectionIcon({ title }: { title: string }) {
  const tLower = title.toLowerCase();
  if (tLower.includes('أولي') || tLower.includes('تقييم') || tLower.includes('تشخيص') || tLower.includes('initial')) {
    return <Stethoscope className="h-4 w-4 text-info" />;
  }
  if (tLower.includes('صحي') || tLower.includes('ملف') || tLower.includes('مطابقة') || tLower.includes('profile')) {
    return <Activity className="h-4 w-4 text-accent" />;
  }
  if (tLower.includes('توجيه') || tLower.includes('نصيح') || tLower.includes('إرشاد') || tLower.includes('guidance')) {
    return <Compass className="h-4 w-4 text-ok" />;
  }
  if (tLower.includes('تحذير') || tLower.includes('خطر') || tLower.includes('warning') || tLower.includes('danger')) {
    return <AlertTriangle className="h-4 w-4 text-danger" />;
  }
  return <Sparkles className="h-4 w-4 text-accent" />;
}

function DoctorAssessmentBody({ summary }: { summary: string }) {
  const sections = useMemo(() => parseClinicalSections(summary), [summary]);

  if (sections.length === 0) {
    return (
      <div className="surface-card p-4 sm:p-5 bg-surface2/30 border border-line/60 rounded-xl">
        <RichText text={summary} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((sec, idx) => (
        <div key={idx} className="surface-card p-4 sm:p-4.5 bg-surface2/30 border border-line/80 rounded-xl space-y-2">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-fg">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface border border-line shadow-xs">
              <SectionIcon title={sec.title} />
            </div>
            <span>{sec.title}</span>
          </div>
          <div className="ps-9 text-sm leading-relaxed text-fg/90">
            <RichText text={sec.content} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DoctorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { health } = useFinance();
  const { createChat } = useChatMutations();
  const { setText: setHalalText, setImage: setHalalImage } = useScan();
  usePageTheme('doctor');

  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [historyList, setHistoryList] = useState<DoctorResult[]>([]);

  // Persistent global doctor scan state across page transitions
  const {
    image,
    setImage,
    text,
    setText,
    busy,
    result,
    setResult,
    chatId,
    setChatId,
    runAnalysis,
    reset,
  } = useDoctorScan();

  const profileReady = useMemo(() => isHealthProfileComplete(health), [health]);
  const hasContent = Boolean(image || text.trim().length >= 3);
  const emergency = Boolean(result?.emergency) || isEmergencyText(text);

  // Load history from IndexedDB on mount
  useEffect(() => {
    void idbGet<DoctorResult[]>(DOCTOR_HISTORY_KEY).then((items) => {
      if (items && Array.isArray(items)) {
        setHistoryList(items);
      }
    });
  }, []);

  // Save consultation to history
  const saveConsultation = useCallback(async (item: DoctorResult) => {
    try {
      const existing = (await idbGet<DoctorResult[]>(DOCTOR_HISTORY_KEY)) || [];
      const filtered = existing.filter((c) => c.createdAt !== item.createdAt);
      const updated = [item, ...filtered].slice(0, 30);
      setHistoryList(updated);
      await idbSet(DOCTOR_HISTORY_KEY, updated);
    } catch {
      // Storage full ignored
    }
  }, []);

  useEffect(() => {
    if (result) {
      void saveConsultation(result);
    }
  }, [result, saveConsultation]);

  // Derived suitability status
  const suitability = useMemo<'suitable' | 'caution' | 'unsuitable' | 'inconclusive'>(() => {
    if (!result) return 'inconclusive';
    if (result.suitability) return result.suitability;
    if (result.emergency || (result.medicine?.contraindications && result.medicine.contraindications.length > 0)) {
      return 'unsuitable';
    }
    if ((result.medicine?.interactions && result.medicine.interactions.length > 0) || result.confidence < 0.6) {
      return 'caution';
    }
    if (result.confidence >= 0.8) {
      return 'suitable';
    }
    return 'inconclusive';
  }, [result]);

  const analyze = async () => {
    if (!profileReady) {
      show('يرجى إكمال ملفك الصحي أولاً لمطابقة الدواء لحالتك وتفادي أي أخطار', 'warning');
      navigate('/profile?tab=me');
      return;
    }
    if (!hasContent) {
      show('يرجى كتابة اسم الدواء أو استفسارك أو التقاط صورة للبدء', 'info');
      textareaRef.current?.focus();
      return;
    }
    const outcome = await runAnalysis(image, text, profileReady);
    if (outcome && outcome.redirect) {
      navigate(outcome.redirect);
      return;
    }
    if (outcome?.chatId) {
      setChatId(outcome.chatId);
    } else if (outcome?.result) {
      const chatTitle =
        outcome.result.medicine?.name ||
        (text.trim() ? text.trim().slice(0, 70) : '') ||
        t('doctor.title', 'استشارة طبية');
      const chat = await createChat({
        kind: 'doctor',
        title: chatTitle,
        initialUserMessage: text.trim() || undefined,
        seedText: outcome.result.summary,
      });
      if (chat) {
        setChatId(chat.id);
      }
    }
  };

  const handleDiscuss = async () => {
    if (chatId) {
      navigate(`/chats/${chatId}`);
      return;
    }
    if (!result) return;
    const chatTitle =
      result.medicine?.name ||
      (text.trim() ? text.trim().slice(0, 70) : '') ||
      t('doctor.title', 'استشارة طبية');
    const chat = await createChat({
      kind: 'doctor',
      title: chatTitle,
      initialUserMessage: text.trim() || undefined,
      seedText: result.summary,
    });
    if (chat) {
      setChatId(chat.id);
      navigate(`/chats/${chat.id}`);
    }
  };

  const handleHalalCheck = () => {
    if (!result) return;
    if (image) setHalalImage(image);
    const content = result.medicine?.name || text.trim() || result.summary.slice(0, 80);
    setHalalText(content);
    haptic(HAPTIC.tap);
    navigate('/halal');
  };

  const calculatedBmi = health.weightKg && health.heightCm ? bmi(health.weightKg, health.heightCm) : null;

  return (
    <div className="flex flex-1 flex-col gap-5 pb-8">
      {/* 1. Page Header */}
      <PageHeader
        icon={<DoctorAvatar size="lg" />}
        eyebrow={t('doctor2.eyebrow')}
        title={t('home2.doctorTitle')}
        subtitle={t('doctor2.subtitle')}
      />

      {/* 2. Compact Health Profile Card (Regular font numbers, tags, completion badge) */}
      <div className="surface-card p-4 sm:p-5">
        {profileReady ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Activity className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-bold text-fg">{t('doctorCard.title', 'ملفي الصحي')}</p>
                    <StatusBadge tone="ok">{t('doctorCard.complete', 'الملف مكتمل')}</StatusBadge>
                  </div>
                  {/* Regular font without monospace */}
                  <p className="font-sans text-xs sm:text-sm font-medium text-muted mt-0.5">
                    {health.age} {t('profile3.years')} · {health.weightKg} {t('profile3.kg')} · BMI {calculatedBmi}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate('/profile?tab=me')}>
                {t('doctorCard.edit', 'تعديل')}
              </Button>
            </div>

            {/* Health Conditions and Current Medications as Pills */}
            {(health.conditions?.length || health.medications?.length) ? (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-line/60">
                {health.conditions?.map((c) => (
                  <Badge key={c} tone="neutral" className="text-xs">
                    {c}
                  </Badge>
                ))}
                {health.medications?.map((m) => (
                  <Badge key={m} tone="neutral" className="text-xs">
                    <Pill className="h-3 w-3 inline me-1 text-accent" />
                    {m}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn">
                <Activity className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-bold text-fg">{t('doctorCard.title', 'ملفي الصحي')}</p>
                  <StatusBadge tone="warn">{t('doctorCard.incomplete', 'ملف غير مكتمل')}</StatusBadge>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {t('doctorCard.incompleteTip', 'أكمل معلومات الطول والوزن والأدوية لتخصيص الاستشارة')}
                </p>
              </div>
            </div>
            <Button size="sm" variant="primary" onClick={() => navigate('/profile?tab=me')} className="shrink-0 w-full sm:w-auto">
              {t('doctorCard.edit', 'إكمال الملف')}
            </Button>
          </div>
        )}
      </div>

      {/* 3. Emergency Banner if triggered */}
      {emergency ? (
        <div className="surface-card border-danger/40 bg-danger-soft/60 p-4 text-danger space-y-3 shadow-sm animate-pulse">
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

      {/* 4. Single Unified Input Desk with 3 Action Buttons (Camera, Gallery, Write) */}
      {!result && (
        <div className="surface-card p-5 sm:p-6 space-y-4">
          {/* Question first — it is the core action */}
          <Textarea
            ref={textareaRef}
            label={t('doctor.inquiryLabel', 'تفاصيل الاستفسار أو اسم الدواء والمكونات')}
            placeholder={t('doctor.inquiryPlaceholder', 'اكتب اسم الدواء، الأعراض، أو استفسارك الصحي لمطابقته مع ملفك...')}
            value={text}
            maxLength={4000}
            onChange={(event) => setText(event.target.value)}
          />

          {/* Optional photo */}
          {image ? (
            <div className="relative mx-auto max-w-md overflow-hidden rounded-xl border border-line bg-black/40 p-2">
              <img src={image.dataUrl} alt="" className="max-h-56 w-full rounded object-contain" />
              <IconButton
                label={t('common.clear')}
                onClick={() => setImage(null)}
                className="absolute end-3 top-3 bg-black/70 text-white hover:bg-black"
              >
                <X className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted">{t('doctor2.attach', 'أرفق صورة (اختياري):')}</span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-3.5 text-sm font-semibold text-fg transition-colors hover:border-tool-doctor hover:bg-tool-doctor-soft"
              >
                <Camera className="h-4 w-4 text-tool-doctor" strokeWidth={1.9} aria-hidden />
                {t('common.camera', 'الكاميرا')}
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-3.5 text-sm font-semibold text-fg transition-colors hover:border-tool-doctor hover:bg-tool-doctor-soft"
              >
                <ImageIcon className="h-4 w-4 text-tool-doctor" strokeWidth={1.9} aria-hidden />
                {t('common.gallery', 'المعرض')}
              </button>
            </div>
          )}

          {/* Action Button: Accurate text based on input mode */}
          <div className="pt-1">
            <Button
              fullWidth
              size="lg"
              variant="primary"
              loading={busy}
              disabled={busy || !hasContent}
              onClick={() => void analyze()}
              icon={hasContent ? <CheckCircle2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            >
              {busy
                ? image
                  ? t('doctor.analyzingImage', 'جارٍ فحص وقراءة الصورة الطبية…')
                  : t('doctor.analyzingText', 'جارٍ فحص ومطابقة الاستفسار الطبي…')
                : image
                  ? t('doctor.scanMedicalPhoto', 'فحص وقراءة الصورة الطبية')
                  : t('doctor.startConsultation', 'بدء الاستشارة الطبية')}
            </Button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) setImage(await prepareImage(file));
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) setImage(await prepareImage(file));
            }}
          />
        </div>
      )}

      {/* Loading Skeleton */}
      {busy && (
        <div className="surface-card p-6 space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {/* 5. Result Card Moment with Structured Semantic Suitability */}
      {result && (
        <div className="surface-card p-5 sm:p-6 space-y-5 border border-line/80 shadow-e2">
          {/* Header with Doctor Avatar & Suitability Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line/60 pb-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <DoctorAvatar size="lg" className="shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-base sm:text-lg font-bold text-fg">
                    د. حكيم · المستشار الطبي
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/20">
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>{i18n.language.startsWith('ru') ? 'ИИ' : i18n.language.startsWith('en') ? 'AI' : 'ذكاء اصطناعي'}</span>
                  </span>
                  <StatusBadge
                    tone={
                      suitability === 'suitable'
                        ? 'ok'
                        : suitability === 'caution'
                          ? 'warn'
                          : suitability === 'unsuitable'
                            ? 'danger'
                            : 'neutral'
                    }
                    icon={
                      suitability === 'suitable' ? (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      ) : suitability === 'caution' ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : suitability === 'unsuitable' ? (
                        <ShieldAlert className="h-3.5 w-3.5" />
                      ) : (
                        <HelpCircle className="h-3.5 w-3.5" />
                      )
                    }
                  >
                    {t(`doctor.suitabilities.${suitability}`)}
                  </StatusBadge>
                </div>
                <p className="text-xs text-muted mt-1 truncate">
                  {result.medicine?.name ||
                    (text.trim() ? text.trim().slice(0, 60) : t(`doctor.types.${result.type}`))}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<MessagesSquare className="h-4 w-4" />}
              onClick={() => void handleDiscuss()}
              className="shrink-0"
            >
              {t('doctor.discussDoctor', 'متابعة المحادثة مع الطبيب')}
            </Button>
          </div>

          {/* Structured Clinical Sections */}
          <DoctorAssessmentBody summary={result.summary} />

          {/* Structured Details if available */}
          {result.medicine && (
            <div className="space-y-3 pt-2 border-t border-line/60">
              {result.medicine.activeIngredient && (
                <div className="surface-card p-3 bg-surface2/40">
                  <p className="text-xs font-bold text-muted">{t('doctor.activeIngredient', 'المادة الفعالة')}</p>
                  <p className="text-sm font-semibold text-fg mt-0.5">
                    <bdi dir="auto">{result.medicine.activeIngredient}</bdi>
                  </p>
                </div>
              )}

              {result.medicine.interactions?.length > 0 && (
                <div className="surface-card p-3 border-warn/30 bg-warn/5">
                  <p className="text-xs font-bold text-warn">{t('doctor.interactions', 'التعارضات مع ملفي')}</p>
                  <ul className="mt-1 space-y-1 text-xs text-fg">
                    {result.medicine.interactions.map((inter) => (
                      <li key={inter} className="flex items-start gap-1.5">
                        <span className="text-warn mt-0.5">•</span>
                        <bdi dir="auto">{inter}</bdi>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.medicine.dosage && (
                <div className="surface-card p-3 bg-surface2/40">
                  <p className="text-xs font-bold text-muted">{t('doctor.dosageAdvice', 'نصيحة الجرعة والتوقيت')}</p>
                  <p className="text-xs text-fg mt-0.5 leading-relaxed">
                    <bdi dir="auto">{result.medicine.dosage}</bdi>
                  </p>
                </div>
              )}

              {result.medicine.whenToSeeDoctor?.length > 0 && (
                <div className="surface-card p-3 border-danger/30 bg-danger/5">
                  <p className="text-xs font-bold text-danger">{t('doctor.urgentSigns', 'علامات تستوجب مراجعة فورية')}</p>
                  <ul className="mt-1 space-y-1 text-xs text-fg">
                    {result.medicine.whenToSeeDoctor.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-danger mt-0.5">•</span>
                        <bdi dir="auto">{item}</bdi>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons: "ناقش الطبيب" (Discuss with Doctor) + "افحص شرعياً" (Check Halal) + "فحص جديد" */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <Button
              fullWidth
              variant="primary"
              size="md"
              icon={<MessagesSquare className="h-4 w-4" />}
              onClick={() => void handleDiscuss()}
            >
              {t('doctor.discussDoctor', 'ناقش الطبيب')}
            </Button>

            <Button
              fullWidth
              variant="secondary"
              size="md"
              icon={<ShieldCheck className="h-4 w-4" />}
              onClick={handleHalalCheck}
            >
              {t('doctor.halalCheck', 'افحص شرعياً')}
            </Button>

            <Button
              fullWidth
              variant="secondary"
              size="md"
              onClick={reset}
            >
              {t('common.newCheck', 'استشارة جديدة')}
            </Button>
          </div>
        </div>
      )}

      {/* 6. Previous Consultations Section */}
      {!result && historyList.length > 0 && (
        <div className="surface-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-fg">
            <History className="h-4 w-4 text-accent" />
            <span>{t('doctor.previousConsultations', 'الاستشارات السابقة')}</span>
            <span className="text-xs font-normal text-muted">({historyList.length})</span>
          </div>

          <div className="divide-y divide-line max-h-72 overflow-y-auto pe-1">
            {historyList.map((item, idx) => (
              <div
                key={`${item.createdAt}-${idx}`}
                onClick={() => {
                  setResult(item);
                  haptic(HAPTIC.tap);
                }}
                className="flex items-center justify-between gap-3 py-3 hover:bg-surface2/60 px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-fg truncate">
                      <bdi dir="auto">{item.medicine?.name || t(`doctor.types.${item.type}`)}</bdi>
                    </p>
                    <StatusBadge
                      tone={
                        item.suitability === 'suitable'
                          ? 'ok'
                          : item.suitability === 'caution'
                            ? 'warn'
                            : item.suitability === 'unsuitable'
                              ? 'danger'
                              : 'neutral'
                      }
                    >
                      {t(`doctor.suitabilities.${item.suitability ?? 'inconclusive'}`)}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-muted line-clamp-1 mt-0.5">
                    <bdi dir="auto">{item.summary}</bdi>
                  </p>
                </div>

                <span className="text-[11px] text-muted shrink-0">
                  {formatCalendarDate(item.createdAt.slice(0, 10), i18n.language)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <Disclaimer>
        {t(
          'doctor.doctorDisclaimer',
          'معلومات توعوية وليست بديلاً عن استشارة الطبيب أو الصيدلي.'
        )}
      </Disclaimer>
    </div>
  );
}
