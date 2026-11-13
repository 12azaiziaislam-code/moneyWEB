import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, Inbox, CheckCircle2, XCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from './cn';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-surface2/80 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-surface/40 before:to-transparent',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      aria-hidden="true"
    />
  );
}

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'info';

const badgeTones: Record<Tone, string> = {
  neutral: 'bg-surface2 text-muted border-line',
  accent: 'bg-accent-soft text-accent border-accent/30',
  ok: 'bg-ok-soft text-ok border-ok/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  info: 'bg-info-soft text-info border-info/30',
};

const defaultToneIcons: Record<Tone, ReactNode> = {
  neutral: <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />,
  accent: <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />,
  ok: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />,
  warn: <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />,
  danger: <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />,
  info: <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />,
};

/**
 * StatusBadge: strictly pairs icon + text + semantic color (no color alone)
 */
export function StatusBadge({
  children,
  tone = 'neutral',
  icon,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border select-none',
        badgeTones[tone],
        className,
      )}
    >
      {icon ?? defaultToneIcons[tone]}
      <span>{children}</span>
    </span>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  icon,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border',
        badgeTones[tone],
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
}

export function Chip({
  children,
  active = false,
  onClick,
  className,
  ariaPressed,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed ?? active}
      className={cn(
        'min-h-[38px] shrink-0 rounded-md border px-4 text-xs sm:text-sm font-bold transition-all duration-fast active:scale-95 cursor-pointer',
        active
          ? 'border-accent bg-accent text-accent-fg shadow-e1'
          : 'border-line bg-surface text-muted hover:text-fg hover:bg-surface2',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  art,
  title,
  body,
  action,
  icon,
}: {
  art?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-lg border border-dashed border-line bg-surface/50 px-6 py-10 text-center">
      <div className="text-accent">{art ?? icon ?? <Inbox className="h-10 w-10 text-muted" aria-hidden />}</div>
      <div className="space-y-1">
        <p className="font-display text-base font-bold text-fg">{title}</p>
        {body ? <p className="mx-auto max-w-[38ch] text-xs sm:text-sm text-muted leading-relaxed">{body}</p> : null}
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  art,
  title,
  body,
  onRetry,
  retryLabel,
}: {
  art?: ReactNode;
  title: string;
  body?: string;
  onRetry?: () => void;
  retryLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-danger/30 bg-danger-soft/40 px-6 py-8 text-center">
      <div className="text-danger">{art ?? <AlertTriangle className="h-10 w-10" aria-hidden />}</div>
      <div className="space-y-1">
        <p className="font-display text-base font-bold text-fg">{title}</p>
        {body ? <p className="max-w-[38ch] text-xs sm:text-sm text-muted leading-relaxed">{body}</p> : null}
      </div>
      {onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-2">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

/** Clear, high-contrast disclaimer compliant with min 13px requirement and WCAG 4.5:1+ */
export function Disclaimer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2.5 rounded-md border border-line bg-surface2/80 p-3 sm:p-3.5 text-[13px] sm:text-[13.5px] leading-relaxed text-fg shadow-sm',
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
      <span className="flex-1">{children}</span>
    </div>
  );
}

export function Progress({ value, tone = 'accent' }: { value: number; tone?: Tone }) {
  const colors: Record<Tone, string> = {
    neutral: 'bg-muted',
    accent: 'bg-accent',
    ok: 'bg-ok',
    warn: 'bg-warn',
    danger: 'bg-danger',
    info: 'bg-info',
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface2" role="presentation">
      <div
        className={cn('h-full rounded-full transition-[width] duration-slow ease-out', colors[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/**
 * ConfirmDialog: Accessible confirmation modal (eliminates clumsy native window.confirm)
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'إلغاء',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const backdropRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        ref={backdropRef}
        type="button"
        aria-label={cancelLabel}
        tabIndex={-1}
        className="fixed inset-0 bg-overlay backdrop-blur-[2px] transition-opacity cursor-pointer border-0"
        onClick={() => !loading && onCancel()}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-sm rounded-lg border border-line bg-surface p-5 shadow-e3 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-md border',
              tone === 'danger'
                ? 'border-danger/30 bg-danger-soft text-danger'
                : 'border-accent/30 bg-accent-soft text-accent',
            )}
          >
            {tone === 'danger' ? <AlertTriangle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="font-display text-base font-bold text-fg">{title}</h3>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line/60">
          <Button variant="ghost" size="sm" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
