/**
 * Baraka v2 — Toasts with Undo Action
 * Accessible, auto-dismiss, RTL safe, compliant with design tokens and 16px radius.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../components/ui/cn';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

export interface ToastApi {
  show: (
    message: string,
    variant?: ToastVariant,
    durationMs?: number,
    action?: ToastAction,
  ) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const variantIcons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-ok shrink-0" aria-hidden />,
  warning: <AlertTriangle className="h-4 w-4 text-warn shrink-0" aria-hidden />,
  danger: <AlertCircle className="h-4 w-4 text-danger shrink-0" aria-hidden />,
  info: <Info className="h-4 w-4 text-accent shrink-0" aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info', durationMs = 4200, action?: ToastAction) => {
      counter.current += 1;
      const id = counter.current;
      setItems((current) => [...current.slice(-2), { id, message, variant, action }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[120] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 w-full max-w-md rounded-lg border p-3.5 shadow-e2 bg-surface text-fg animate-pop',
              item.variant === 'danger' && 'border-danger/30 bg-danger-soft/40',
              item.variant === 'warning' && 'border-warn/30 bg-warn-soft/40',
              item.variant === 'success' && 'border-ok/30 bg-ok-soft/40',
              item.variant === 'info' && 'border-accent/30 bg-accent-soft/40',
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {variantIcons[item.variant]}
              <span className="text-xs sm:text-sm font-bold text-fg leading-snug truncate">
                <bdi dir="auto">{item.message}</bdi>
              </span>
            </div>
            {item.action ? (
              <button
                type="button"
                onClick={() => {
                  item.action?.onClick();
                  dismiss(item.id);
                }}
                className="shrink-0 text-xs font-bold text-accent hover:underline px-2 py-1 rounded cursor-pointer"
              >
                {item.action.label}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="text-muted hover:text-fg p-1 rounded transition-colors cursor-pointer"
              aria-label="إغلاق التنبيه"
            >
              <X className="h-4 w-4" aria-hidden />
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
