/** Toasts + inline confirmations (accessible, auto-dismiss, RTL safe). */

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastApi {
  show: (message: string, variant?: ToastVariant, durationMs?: number) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info', durationMs = 3800) => {
      counter.current += 1;
      const id = counter.current;
      setItems((current) => [...current.slice(-2), { id, message, variant }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={[
              'pointer-events-auto w-full max-w-app rounded-2xl px-4 py-3 text-sm shadow-card animate-pop',
              item.variant === 'success'
                ? 'bg-brand-600 text-white'
                : item.variant === 'danger'
                  ? 'bg-rose-600 text-white'
                  : item.variant === 'warning'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900',
            ].join(' ')}
          >
            <button
              type="button"
              className="w-full text-start"
              onClick={() => dismiss(item.id)}
              aria-label={item.message}
            >
              {item.message}
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
