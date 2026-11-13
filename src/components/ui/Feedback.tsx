import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Info } from 'lucide-react';
import { cn } from './cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md bg-surface2', className)} aria-hidden="true" />;
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
  neutral: 'bg-surface2 text-muted',
  accent: 'bg-accent text-accent-fg',
  ok: 'bg-okSoft text-ok',
  warn: 'bg-warnSoft text-warn',
  danger: 'bg-dangerSoft text-danger',
  info: 'bg-infoSoft text-info',
};

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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide',
        badgeTones[tone],
        className,
      )}
    >
      {icon}
      {children}
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
        'min-h-[38px] shrink-0 rounded-full border px-3.5 text-sm font-semibold transition-all duration-mid active:scale-95',
        active
          ? 'border-transparent bg-accent text-accent-fg shadow-e1'
          : 'border-line bg-surface text-muted hover:text-fg',
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
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-6 py-9 text-center">
      <div className="text-accent">{art ?? icon ?? <Inbox className="h-10 w-10" aria-hidden />}</div>
      <div>
        <p className="text-base font-bold text-fg">{title}</p>
        {body ? <p className="mx-auto mt-1 max-w-[34ch] text-sm text-muted">{body}</p> : null}
      </div>
      {action}
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
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface px-6 py-8 text-center">
      <div className="text-warn">{art ?? <AlertTriangle className="h-10 w-10" aria-hidden />}</div>
      <p className="text-base font-bold">{title}</p>
      {body ? <p className="max-w-[36ch] text-sm text-muted">{body}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[42px] rounded-md bg-surface2 px-4 text-sm font-semibold text-fg"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

/** Small print used under AI results and health/money screens. */
export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1 flex gap-1.5 rounded-md bg-surface2 px-3 py-2 text-[11px] leading-relaxed text-muted">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
      <span>{children}</span>
    </p>
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
