/**
 * Baraka v2 — Halal Ingredient Verification Desk
 * Single responsibility: Islamic Sharia evaluation of product ingredients (food/medicine/cosmetics).
 * No medical advice here.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Image as ImageIcon,
  Type,
  X,
  ScanLine,
  History,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  Scale,
} from 'lucide-react';
import type { HalalResult, Madhhab, Verdict } from '../../shared/types';
import { quickScreenText } from '../../shared/halalRules';
import { PageHeader } from '../components/AppShell';
import { SheikhAvatar } from '../components/characters/Personas';
import { VerdictCard } from '../components/VerdictCard';
import { Button, IconButton } from '../components/ui/Button';
import { Disclaimer, StatusBadge } from '../components/ui/Feedback';
import { Textarea } from '../components/ui/Field';
import { Sheet } from '../components/ui/Sheet';
import { cn } from '../components/ui';
import { prepareImage } from '../lib/image';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { useScan } from '../state/ScanContext';
import { useDoctorScan } from '../state/DoctorScanContext';
import { usePageTheme } from '../lib/theme';
import { useChatMutations } from '../data/chats';
import { formatCalendarDate } from '../lib/format';
import { haptic, HAPTIC } from '../lib/haptics';
import { idbGet, idbSet } from '../lib/idb';

const SCAN_STEPS = [
  { key: 'ocr', labelAr: 'قراءة نصوص الملصق والـ OCR', labelEn: 'Extracting label text & OCR', labelRu: 'Распознавание текста с этикетки' },
  { key: 'additives', labelAr: 'تدقيق الإضافات ورموز E والجيلاتين', labelEn: 'Screening E-numbers & gelatin', labelRu: 'Проверка добавок, E-кодов и желатина' },
  { key: 'fiqh', labelAr: 'مطابقة الضوابط والمعايير الشرعية', labelEn: 'Cross-checking Sharia principles', labelRu: 'Сверка с нормами Шариата' },
  { key: 'verdict', labelAr: 'صياغة التقرير والنتيجة النهائية', labelEn: 'Preparing final verdict', labelRu: 'Формирование итогового заключения' },
];

const MADHHABS: Madhhab[] = ['none', 'hanafi', 'shafii', 'maliki', 'hanbali'];
const HALAL_HISTORY_KEY = 'halal.history.v2';

export function HalalPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('ru') ? 'Ru' : i18n.language.startsWith('en') ? 'En' : 'Ar';
  const navigate = useNavigate();
  const { show } = useToast();
  const { role, user, patchUser, updateGuestSettings } = useAuth();
  const { createChat } = useChatMutations();
  const { setImage: setDoctorImage, setText: setDoctorText } = useDoctorScan();
  usePageTheme('halal');

  const isGuest = role === 'guest';
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [discussing, setDiscussing] = useState(false);
  const [showMadhabModal, setShowMadhabModal] = useState(false);
  const [historyList, setHistoryList] = useState<HalalResult[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | Verdict>('all');
  const [isSaved, setIsSaved] = useState(false);

  const currentMadhhab: Madhhab = user?.madhhab ?? 'none';

  // Global scan state & operations preserved across route changes
  const {
    image,
    setImage,
    text,
    setText,
    typing,
    setTyping,
    busy,
    setBusy,
    result,
    setResult,
    progress,
    activeStep,
    elapsed,
    runScan,
    reset,
  } = useScan();

  // Load history on mount
  useEffect(() => {
    void idbGet<HalalResult[]>(HALAL_HISTORY_KEY).then((items) => {
      if (items && Array.isArray(items)) {
        setHistoryList(items);
      }
    });
  }, []);

  // Save scan result to history whenever a new result arrives
  const saveScanToHistory = useCallback(async (scanResult: HalalResult) => {
    try {
      const existing = (await idbGet<HalalResult[]>(HALAL_HISTORY_KEY)) || [];
      const filtered = existing.filter((item) => item.id !== scanResult.id);
      const updated = [scanResult, ...filtered].slice(0, 30);
      setHistoryList(updated);
      await idbSet(HALAL_HISTORY_KEY, updated);
      setIsSaved(true);
    } catch {
      // Storage silently ignored if full
    }
  }, []);

  useEffect(() => {
    if (result) {
      void saveScanToHistory(result);
    }
  }, [result, saveScanToHistory]);

  // Instant local rule pre-screening for manual text
  const quickInsight = useMemo(() => {
    if (!text || text.trim().length < 3) return null;
    return quickScreenText(text);
  }, [text]);

  // Distinct verdict types in history (for conditional filter pills)
  const distinctVerdicts = useMemo(() => {
    const set = new Set<Verdict>();
    for (const item of historyList) {
      set.add(item.verdict);
    }
    return Array.from(set);
  }, [historyList]);

  const filteredHistory = useMemo(() => {
    if (selectedFilter === 'all') return historyList;
    return historyList.filter((item) => item.verdict === selectedFilter);
  }, [historyList, selectedFilter]);

  const pickFile = async (file?: File) => {
    if (!file) return;
    try {
      const prepared = await prepareImage(file);
      setImage(prepared);
      setTyping(false);
      setIsSaved(false);
      haptic(HAPTIC.tap);
      void runScan(prepared, text, lang);
    } catch (error) {
      const code = (error as Error).message;
      show(code === 'too_large' ? t('errors.payload_too_large') : t('errors.validation_failed'), 'danger');
    }
  };

  const handleMadhhabChange = async (madhhab: Madhhab) => {
    try {
      if (role === 'guest') {
        await updateGuestSettings({ madhhab });
      } else {
        await patchUser({ madhhab });
      }
      setShowMadhabModal(false);
      haptic(HAPTIC.tap);
      show(t('common.saved', 'تم الحفظ'), 'info');
    } catch {
      show(t('errors.generic'), 'danger');
    }
  };

  const handleDoctorCheck = () => {
    if (!result) return;
    if (image) setDoctorImage(image);
    const summary = result.product
      ? `${result.product} (${result.ingredients.map((i) => i.name).join('، ')})`
      : result.reason;
    setDoctorText(summary);
    haptic(HAPTIC.tap);
    navigate('/doctor');
  };

  const handleSaveResult = async () => {
    if (!result) return;
    await saveScanToHistory(result);
    setIsSaved(true);
    haptic(HAPTIC.tap);
    show(t('halal.saved', 'تم الحفظ في الفحوصات السابقة'), 'info');
  };

  const discuss = async () => {
    if (isGuest) {
      show(t('guest.aiRequiresAuth'), 'warning');
      return;
    }
    if (!result) return;
    setDiscussing(true);
    try {
      const isRu = lang === 'Ru';
      const isEn = lang === 'En';
      const verdictLabel = isRu
        ? result.verdict === 'halal'
          ? 'Халяль'
          : result.verdict === 'haram'
            ? 'Харам'
            : result.verdict === 'inconclusive'
              ? 'Неопределенно'
              : 'Сомнительно (машбух)'
        : isEn
          ? result.verdict === 'halal'
            ? 'Halal'
            : result.verdict === 'haram'
              ? 'Haram'
              : result.verdict === 'inconclusive'
                ? 'Inconclusive'
                : 'Doubtful (Mashbooh)'
          : result.verdict === 'halal'
            ? 'حلال'
            : result.verdict === 'haram'
              ? 'حرام'
              : result.verdict === 'inconclusive'
                ? 'غير حاسم'
                : 'مشتبه به';

      const seedParts = isRu
        ? [
            `📦 **Проверка продукта:** ${result.product || 'Продукт'}`,
            `• **Предварительное заключение:** ${verdictLabel} (${Math.round(result.confidence * 100)}%)`,
            `• **Причина:** ${result.reason}`,
            result.concerns.length ? `• **Сомнительные моменты:** ${result.concerns.join('; ')}` : null,
            result.needed.length ? `• **Необходимо для подтверждения:** ${result.needed.join('; ')}` : null,
          ]
        : isEn
          ? [
              `📦 **Product Inspection:** ${result.product || 'Product'}`,
              `• **Initial Verdict:** ${verdictLabel} (${Math.round(result.confidence * 100)}%)`,
              `• **Reason:** ${result.reason}`,
              result.concerns.length ? `• **Concerns:** ${result.concerns.join('; ')}` : null,
              result.needed.length ? `• **Needed to Confirm:** ${result.needed.join('; ')}` : null,
            ]
          : [
              `📦 **فحص المكونات:** ${result.product || 'منتج غذائي'}`,
              `• **الحكم المبدئي:** ${verdictLabel} (نسبة التقدير: ${Math.round(result.confidence * 100)}%)`,
              `• **بيان العلة:** ${result.reason}`,
              result.concerns.length ? `• **مواضع التحفظ والشبهة:** ${result.concerns.join('؛ ')}` : null,
              result.needed.length ? `• **المطلوب للحسم:** ${result.needed.join('؛ ')}` : null,
            ];

      const seed = seedParts.filter(Boolean).join('\n\n');
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
      {/* 1. Header with Clickable Madhab Quick Switcher */}
      <PageHeader
        icon={<SheikhAvatar size="lg" />}
        eyebrow={t('halal2.eyebrow')}
        title={t('home2.halalTitle')}
        subtitle={t('halal2.subtitle')}
        action={
          <button
            type="button"
            onClick={() => setShowMadhabModal(true)}
            className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg shadow-xs transition-colors hover:border-tool-halal"
          >
            <Scale className="h-4 w-4 text-tool-halal" aria-hidden />
            <span className="text-muted">{t('profile3.madhhabTitle')}:</span>
            <span className="font-bold">{t(`profile.madhhabs.${currentMadhhab}`)}</span>
            <ChevronDown className="h-4 w-4 text-muted transition-colors group-hover:text-fg" aria-hidden />
          </button>
        }
      />

      {/* =====================================================================
          2. COMPACT SCANNING STATION (Active or Ready)
          ===================================================================== */}
      {!result && !busy ? (
        <div className="space-y-4">
          <div className="surface-card p-5 sm:p-6">
            {image ? (
              /* Image Uploaded: Viewfinder Preview with Rescan Action */
              <div className="space-y-4">
                <div className="relative rounded-xl border border-line/80 bg-black/40 p-4 flex items-center justify-center overflow-hidden min-h-[200px]">
                  <div className="absolute top-2.5 start-2.5 h-4 w-4 border-t-2 border-s-2 border-accent" />
                  <div className="absolute top-2.5 end-2.5 h-4 w-4 border-t-2 border-e-2 border-accent" />
                  <div className="absolute bottom-2.5 start-2.5 h-4 w-4 border-b-2 border-s-2 border-accent" />
                  <div className="absolute bottom-2.5 end-2.5 h-4 w-4 border-b-2 border-e-2 border-accent" />

                  <img src={image.dataUrl} alt="" className="max-h-64 w-full object-contain mx-auto rounded" />
                  <IconButton
                    label={t('common.clear')}
                    onClick={() => setImage(null)}
                    className="absolute end-3 top-3 bg-black/70 text-white hover:bg-black"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </IconButton>
                </div>

                <Button
                  fullWidth
                  size="lg"
                  variant="primary"
                  loading={busy}
                  onClick={() => void runScan(image, text, lang)}
                  icon={<ScanLine className="h-5 w-5" />}
                >
                  {t('halal.scan')}
                </Button>
              </div>
            ) : (
              /* Scan desk: three equal ways in */
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-lg font-bold text-fg">{t('halal2.deskTitle')}</h2>
                  <p className="mt-1 text-sm text-muted">{t('halal2.deskHint')}</p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {[
                    {
                      id: 'camera',
                      Icon: Camera,
                      label: t('halal2.camera'),
                      primary: true,
                      onClick: () => (isGuest ? show(t('guest.aiRequiresAuth'), 'warning') : cameraRef.current?.click()),
                    },
                    {
                      id: 'gallery',
                      Icon: ImageIcon,
                      label: t('halal2.gallery'),
                      primary: false,
                      onClick: () => (isGuest ? show(t('guest.aiRequiresAuth'), 'warning') : galleryRef.current?.click()),
                    },
                    {
                      id: 'type',
                      Icon: Type,
                      label: t('halal2.type'),
                      primary: false,
                      onClick: () => setTyping((prev) => !prev),
                    },
                  ].map(({ id, Icon, label, primary, onClick }) => {
                    const active = id === 'type' && typing;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={onClick}
                        aria-pressed={id === 'type' ? typing : undefined}
                        className={cn(
                          'flex min-h-[104px] flex-col items-center justify-center gap-2.5 rounded-xl border px-2 py-4 text-sm font-bold transition-all',
                          primary
                            ? 'border-transparent bg-tool-halal text-white shadow-e2 hover:brightness-110 dark:text-[#04261b]'
                            : active
                              ? 'border-tool-halal bg-tool-halal-soft text-fg'
                              : 'border-line bg-surface2/50 text-fg hover:border-fg/20 hover:bg-surface2',
                        )}
                      >
                        <Icon className={cn('h-6 w-6', !primary && 'text-tool-halal')} strokeWidth={1.8} aria-hidden />
                        <span className="text-center leading-tight">{label}</span>
                      </button>
                    );
                  })}
                </div>

                {isGuest ? (
                  <p className="rounded-lg bg-surface2/60 px-3.5 py-2.5 text-xs leading-relaxed text-muted">
                    {t('halal2.guestNote')}
                  </p>
                ) : null}

                {/* Inline text entry */}
                {typing && (
                  <div className="space-y-3 border-t border-line pt-4 text-start">
                    <Textarea
                      label={t('halal.placeholder', 'اكتب المكوّنات أو الرموز هنا...')}
                      value={text}
                      maxLength={4000}
                      onChange={(event) => setText(event.target.value)}
                    />

                    {/* Instant Local Rule Insight Badge */}
                    {quickInsight && quickInsight.matches.length > 0 && (
                      <div
                        className={
                          quickInsight.verdict === 'haram'
                            ? 'rounded-xl border border-danger/40 bg-danger-soft/40 p-3 text-xs space-y-1'
                            : 'rounded-xl border border-warn/40 bg-warn-soft/40 p-3 text-xs space-y-1'
                        }
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle
                            className={quickInsight.verdict === 'haram' ? 'h-4 w-4 text-danger' : 'h-4 w-4 text-warn'}
                          />
                          <span className={quickInsight.verdict === 'haram' ? 'text-danger' : 'text-warn'}>
                            {quickInsight.verdict === 'haram' ? 'رصد فوري لمكون محرم' : 'رصد فوري لشبهة تستوجب التوقف'}
                          </span>
                        </div>
                        <p className="text-muted leading-relaxed">
                          {quickInsight.matches[0][('reason' + lang) as 'reasonAr' | 'reasonRu' | 'reasonEn']}
                        </p>
                      </div>
                    )}

                    <Button
                      fullWidth
                      size="md"
                      variant="primary"
                      loading={busy}
                      disabled={text.trim().length < 3}
                      onClick={() => void runScan(null, text, lang)}
                    >
                      {t('halal.scan', 'افحص الآن')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Native Hidden Inputs */}
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

          {/* How it works — three short steps */}
          {historyList.length === 0 ? (
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <li key={n} className="flex items-start gap-3 rounded-xl border border-line bg-surface/60 p-4">
                  <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tool-halal-soft text-sm font-bold text-tool-halal">
                    {n}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-fg">{t(`halal2.step${n}Title`)}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t(`halal2.step${n}Body`)}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}

          {/* ===================================================================
              3. PREVIOUS CHECKS SECTION (Real stored checks only)
              =================================================================== */}
          {historyList.length > 0 && (
            <div className="surface-card p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-fg">
                  <History className="h-4 w-4 text-accent" />
                  <span>{t('halal.previousChecks', 'الفحوصات السابقة')}</span>
                  <span className="text-xs font-normal text-muted">({historyList.length})</span>
                </div>

                {/* Filter Pills: Visible ONLY when more than 1 distinct verdict type exists */}
                {distinctVerdicts.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedFilter('all')}
                      className={`px-2.5 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                        selectedFilter === 'all'
                          ? 'bg-accent text-accent-fg font-bold'
                          : 'bg-surface2 text-muted hover:text-fg'
                      }`}
                    >
                      {t('common.all', 'الكل')}
                    </button>
                    {distinctVerdicts.map((verd) => (
                      <button
                        key={verd}
                        type="button"
                        onClick={() => setSelectedFilter(verd)}
                        className={`px-2.5 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                          selectedFilter === verd
                            ? 'bg-accent text-accent-fg font-bold'
                            : 'bg-surface2 text-muted hover:text-fg'
                        }`}
                      >
                        {t(`halal.verdict.${verd}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="divide-y divide-line max-h-72 overflow-y-auto pe-1">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setResult(item);
                      setIsSaved(true);
                      haptic(HAPTIC.tap);
                    }}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-surface2/60 px-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-fg truncate">
                          <bdi dir="auto">{item.product || t('halal.title')}</bdi>
                        </p>
                        <StatusBadge
                          tone={
                            item.verdict === 'halal'
                              ? 'ok'
                              : item.verdict === 'haram'
                                ? 'danger'
                                : item.verdict === 'mashbooh'
                                  ? 'warn'
                                  : 'neutral'
                          }
                        >
                          {t(`halal.verdict.${item.verdict}`)}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-muted line-clamp-1 mt-0.5">
                        <bdi dir="auto">{item.reason}</bdi>
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
        </div>
      ) : null}

      {/* =====================================================================
          4. HIGH-PRECISION ACTIVE SCANNING RADAR
          ===================================================================== */}
      {busy ? (
        <div className="surface-card p-5 sm:p-7 space-y-5">
          {/* Laser Scanning Viewfinder */}
          <div className="relative rounded-xl border border-line/80 bg-black/40 p-4 flex flex-col items-center justify-center overflow-hidden min-h-[220px]">
            <div className="absolute top-2.5 start-2.5 h-4 w-4 border-t-2 border-s-2 border-accent" />
            <div className="absolute top-2.5 end-2.5 h-4 w-4 border-t-2 border-e-2 border-accent" />
            <div className="absolute bottom-2.5 start-2.5 h-4 w-4 border-b-2 border-s-2 border-accent" />
            <div className="absolute bottom-2.5 end-2.5 h-4 w-4 border-b-2 border-e-2 border-accent" />

            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_12px_var(--accent)] animate-scan pointer-events-none" />

            {image ? (
              <img src={image.dataUrl} alt="" className="max-h-60 w-full object-contain mx-auto rounded opacity-80" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-6 text-accent">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft/60 border border-accent/30">
                  <ScanLine className="h-8 w-8 animate-pulse text-accent" />
                </div>
                <p className="text-xs font-semibold text-muted max-w-[28ch] text-center truncate">
                  {text.slice(0, 45)}...
                </p>
              </div>
            )}
          </div>

          {/* Progress Header & Live Timer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-fg">
              <div className="flex items-center gap-1.5 text-accent">
                <Sparkles className="h-4 w-4" />
                <span>{t('halal.fastScanHeader', 'فحص ذكي فوري للمكونات')}</span>
              </div>
              <div className="flex items-center gap-1 text-muted">
                <Clock className="h-3.5 w-3.5" />
                <span>{elapsed.toFixed(1)} ثانية</span>
              </div>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full bg-accent transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Progressive Real-time Step Checklist */}
          <div className="space-y-2 pt-1 border-t border-line/60">
            {SCAN_STEPS.map((step, idx) => {
              const isDone = activeStep > idx;
              const isCurrent = activeStep === idx;
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all ${
                    isCurrent
                      ? 'bg-accent-soft/40 border border-accent/30 font-bold text-fg'
                      : isDone
                        ? 'text-muted line-through opacity-70'
                        : 'text-muted-soft opacity-40'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-ok shrink-0" />
                  ) : isCurrent ? (
                    <span className="h-2 w-2 rounded-full bg-accent animate-ping shrink-0" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-border shrink-0" />
                  )}
                  <span className="truncate">
                    {step[('label' + lang) as 'labelAr' | 'labelEn' | 'labelRu']}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setBusy(false)}
              className="text-xs font-semibold text-muted hover:text-danger cursor-pointer transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          5. RESULT VERDICT MOMENT
          ===================================================================== */}
      {result ? (
        <div className="space-y-4">
          <VerdictCard
            result={result}
            imageUrl={image?.dataUrl ?? null}
            onDiscuss={() => void discuss()}
            onDoctorCheck={handleDoctorCheck}
            onSave={() => void handleSaveResult()}
            onRescan={() => {
              reset();
              cameraRef.current?.click();
            }}
            discussing={discussing}
            saved={isSaved}
          />

          <Button variant="secondary" fullWidth size="md" onClick={reset}>
            {t('halal.newScan', 'فحص منتج جديد')}
          </Button>

          {/* Unified Disclaimer adjacent to the result */}
          <Disclaimer>{t('halal.disclaimer', 'تحليل مساعد وليس فتوى. في الأمور الخلافية ارجع لأهل العلم.')}</Disclaimer>
        </div>
      ) : (
        /* Disclaimer on the initial scan desk */
        <Disclaimer>{t('halal.disclaimer', 'تحليل مساعد وليس فتوى. في الأمور الخلافية ارجع لأهل العلم.')}</Disclaimer>
      )}

      {/* =====================================================================
          6. QUICK MADHHAB SELECTION MODAL
          ===================================================================== */}
      <Sheet open={showMadhabModal} title={t('profile3.madhhabTitle')} onClose={() => setShowMadhabModal(false)}>
        <p className="mb-4 text-sm leading-relaxed text-muted">{t('profile3.madhhabDesc')}</p>
        <div role="radiogroup" aria-label={t('profile3.madhhabTitle')} className="space-y-2">
          {MADHHABS.map((madh) => {
            const selected = currentMadhhab === madh;
            return (
              <button
                key={madh}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => void handleMadhhabChange(madh)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3.5 text-start transition-colors',
                  selected ? 'border-tool-halal bg-tool-halal-soft' : 'border-line hover:bg-surface2/60',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-fg">{t(`profile.madhhabs.${madh}`)}</span>
                  <span className="mt-0.5 block text-xs text-muted">{t(`profile3.madhhabDescs.${madh}`)}</span>
                </span>
                {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-tool-halal" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </Sheet>
    </div>
  );
}
