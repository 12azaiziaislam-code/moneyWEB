/**
 * Global Doctor Scan Context — Preserves active medication/dietary analyses
 * and state across page navigations.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { DoctorResult } from '../../shared/types';
import { ApiError, apiFetch } from '../lib/api';
import type { PreparedImage } from '../lib/image';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { haptic, HAPTIC } from '../lib/haptics';

interface DoctorScanContextValue {
  image: PreparedImage | null;
  setImage: (img: PreparedImage | null) => void;
  text: string;
  setText: (txt: string) => void;
  busy: boolean;
  result: DoctorResult | null;
  setResult: (res: DoctorResult | null) => void;
  runAnalysis: (
    targetImage: PreparedImage | null,
    targetText: string,
    profileReady: boolean,
  ) => Promise<{ redirect?: string } | void>;
  reset: () => void;
}

const DoctorScanContext = createContext<DoctorScanContextValue | null>(null);

export function DoctorScanProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const { show } = useToast();

  const [image, setImage] = useState<PreparedImage | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DoctorResult | null>(null);

  const reset = useCallback(() => {
    setImage(null);
    setText('');
    setResult(null);
  }, []);

  const runAnalysis = useCallback(
    async (
      targetImage: PreparedImage | null,
      targetText: string,
      profileReady: boolean,
    ) => {
      if (role === 'guest') {
        show('استشارات الذكاء الاصطناعي الكاملة تتطلب حساباً مجانياً', 'warning');
        return;
      }
      if (!profileReady) {
        show('أكمل ملفك الصحي أولاً ليعطيك الطبيب إجابة مناسبة لحالتك', 'warning');
        return;
      }
      if (!targetImage && targetText.trim().length < 3) {
        show('أرسل صورة أو نصاً للبدء', 'warning');
        return;
      }

      setBusy(true);
      setResult(null);

      try {
        const body: Record<string, unknown> = {
          text: targetText.trim() || undefined,
          hash: targetImage?.hash,
          imageDataUrl: targetImage?.dataUrl,
        };

        const response = await apiFetch<{ result: DoctorResult; redirect?: string }>(
          '/api/doctor/analyze',
          {
            method: 'POST',
            body,
          },
        );

        setResult(response.result);
        haptic(response.result.emergency ? HAPTIC.danger : HAPTIC.success);
        return { redirect: response.redirect };
      } catch (cause) {
        if (cause instanceof ApiError && cause.code === 'forbidden') {
          show('أكمل ملفك الصحي أولاً ليعطيك الطبيب إجابة مناسبة لحالتك', 'warning');
        } else {
          show('خدمة الاستشارة الطبية غير متاحة مؤقتاً', 'danger');
        }
      } finally {
        setBusy(false);
      }
    },
    [role, show],
  );

  return (
    <DoctorScanContext.Provider
      value={{
        image,
        setImage,
        text,
        setText,
        busy,
        result,
        setResult,
        runAnalysis,
        reset,
      }}
    >
      {children}
    </DoctorScanContext.Provider>
  );
}

export function useDoctorScan(): DoctorScanContextValue {
  const ctx = useContext(DoctorScanContext);
  if (!ctx) throw new Error('useDoctorScan must be used inside <DoctorScanProvider>');
  return ctx;
}
