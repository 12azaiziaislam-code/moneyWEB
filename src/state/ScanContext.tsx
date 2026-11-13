/**
 * Global Scan Context — Preserves active halal scans, progress, results,
 * and background operations across page navigations.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { HalalResult } from '../../shared/types';
import { quickScreenText } from '../../shared/halalRules';
import { apiFetch } from '../lib/api';
import type { PreparedImage } from '../lib/image';
import { CacheKeys, idbGet, idbSet } from '../lib/idb';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { haptic, HAPTIC } from '../lib/haptics';

interface ScanContextValue {
  image: PreparedImage | null;
  setImage: (img: PreparedImage | null) => void;
  text: string;
  setText: (txt: string) => void;
  typing: boolean;
  setTyping: (val: boolean | ((prev: boolean) => boolean)) => void;
  busy: boolean;
  setBusy: (val: boolean) => void;
  result: HalalResult | null;
  setResult: (res: HalalResult | null) => void;
  lastCached: HalalResult | null;
  setLastCached: (res: HalalResult | null) => void;
  progress: number;
  activeStep: number;
  elapsed: number;
  runScan: (targetImage: PreparedImage | null, targetText: string, lang?: string) => Promise<void>;
  reset: () => void;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const { show } = useToast();
  const isGuest = role === 'guest';

  const [image, setImage] = useState<PreparedImage | null>(null);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HalalResult | null>(null);
  const [lastCached, setLastCached] = useState<HalalResult | null>(null);

  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(15);
  const [elapsed, setElapsed] = useState(0);

  const tickerRef = useRef<number | null>(null);

  // Initialize cached result from IndexedDB on startup
  useEffect(() => {
    void idbGet<HalalResult>(CacheKeys.halalLast).then((cached) => {
      if (cached) {
        setLastCached(cached);
      }
    });
  }, []);

  // Manage progress timer while busy
  useEffect(() => {
    if (!busy) {
      if (tickerRef.current) clearInterval(tickerRef.current);
      return;
    }

    setActiveStep(0);
    setProgress(15);
    setElapsed(0);

    const start = Date.now();
    tickerRef.current = window.setInterval(() => {
      const now = Date.now();
      const sec = Math.round((now - start) / 100) / 10;
      setElapsed(sec);

      if (sec > 0.8 && sec <= 1.8) {
        setActiveStep(1);
        setProgress(45);
      } else if (sec > 1.8 && sec <= 2.8) {
        setActiveStep(2);
        setProgress(75);
      } else if (sec > 2.8) {
        setActiveStep(3);
        setProgress(92);
      }
    }, 100);

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [busy]);

  const reset = useCallback(() => {
    setImage(null);
    setText('');
    setResult(null);
    setTyping(false);
  }, []);

  const runScan = useCallback(
    async (targetImage: PreparedImage | null, targetText: string, lang = 'Ar') => {
      const cleanText = targetText.trim();
      if (!targetImage && cleanText.length < 3) {
        show('يرجى كتابة نص المكونات أو التقاط صورة لبدء الفحص', 'warning');
        return;
      }

      // Fast rule pre-screen for text
      const quickInsight = cleanText.length >= 3 ? quickScreenText(cleanText) : null;
      if (!targetImage && quickInsight && quickInsight.matches.length > 0) {
        const first = quickInsight.matches[0];
        const localResult: HalalResult = {
          id: 'fast_' + Date.now(),
          product: cleanText.slice(0, 35),
          verdict: quickInsight.verdict === 'haram' ? 'haram' : 'mashbooh',
          confidence: 0.95,
          ingredients: quickInsight.matches.map((m) => ({
            name: m.name,
            status: m.category,
            note: m[('reason' + lang) as 'reasonAr' | 'reasonRu' | 'reasonEn'],
          })),
          concerns: quickInsight.matches.map((m) => m[('reason' + lang) as 'reasonAr' | 'reasonRu' | 'reasonEn']),
          reason: first[('reason' + lang) as 'reasonAr' | 'reasonRu' | 'reasonEn'],
          needed: quickInsight.verdict === 'mashbooh' ? ['التأكد من مصدر الجيلاتين/المستحلب من الشركة المصنعة'] : [],
          evidence: quickInsight.verdict === 'haram' ? 'سورة البقرة: 173' : null,
          createdAt: new Date().toISOString(),
          cached: true,
        };
        setResult(localResult);
        setLastCached(localResult);
        void idbSet(CacheKeys.halalLast, localResult);
        haptic(localResult.verdict === 'halal' ? HAPTIC.success : HAPTIC.danger);
        show('تم فحص المكونات فورياً بالذكاء السريع المحلي (0ms)', 'info');
        return;
      }

      if (isGuest) {
        show('فحص الصور واستشارات الذكاء الاصطناعي الكاملة تتطلب حساباً مجانياً', 'warning');
        return;
      }

      // Local hash cache
      if (targetImage?.hash) {
        const local = await idbGet<HalalResult>('halal.hash.' + targetImage.hash);
        if (local) {
          setResult(local);
          setLastCached(local);
          haptic(local.verdict === 'halal' ? HAPTIC.success : HAPTIC.danger);
          return;
        }
      }

      setBusy(true);
      setResult(null);

      try {
        const body: Record<string, unknown> = {
          text: cleanText || undefined,
          hash: targetImage?.hash,
          imageDataUrl: targetImage?.dataUrl,
        };

        const response = await apiFetch<{ result: HalalResult }>('/api/halal/scan', {
          method: 'POST',
          body,
        });

        setProgress(100);
        setActiveStep(3);
        await new Promise((r) => setTimeout(r, 180));

        setResult(response.result);
        setLastCached(response.result);
        void idbSet(CacheKeys.halalLast, response.result);
        if (targetImage?.hash) {
          void idbSet('halal.hash.' + targetImage.hash, response.result);
        }

        haptic(response.result.verdict === 'halal' ? HAPTIC.success : HAPTIC.danger);
      } catch {
        show('تعذر إكمال الفحص، يرجى المحاولة مرة أخرى', 'danger');
      } finally {
        setBusy(false);
      }
    },
    [isGuest, show],
  );

  return (
    <ScanContext.Provider
      value={{
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
        lastCached,
        setLastCached,
        progress,
        activeStep,
        elapsed,
        runScan,
        reset,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan(): ScanContextValue {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used inside <ScanProvider>');
  return ctx;
}
