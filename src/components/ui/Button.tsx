import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'soft' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2.5 font-bold transition-all duration-fast ease-out ' +
  'active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ' +
  'disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none cursor-pointer';

const sizes: Record<Size, string> = {
  sm: 'min-h-[38px] rounded-sm px-3 text-xs sm:text-sm',
  md: 'min-h-[46px] rounded-md px-4 text-sm sm:text-base',
  lg: 'min-h-[52px] rounded-lg px-6 text-base tracking-tight',
};

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg border border-accent/40 shadow-1 hover:brightness-105 active:brightness-95',
  secondary:
    'bg-surface2 text-fg border border-line shadow-1 hover:bg-surface2/80 active:bg-surface2',
  outline:
    'bg-transparent text-fg border border-line hover:bg-surface2 hover:border-fg/20 active:bg-surface2',
  soft:
    'bg-accent-soft text-accent border border-transparent hover:brightness-95 active:brightness-90',
  ghost:
    'bg-transparent text-muted hover:text-fg hover:bg-surface2 active:bg-surface2',
  danger:
    'bg-danger text-danger-fg border border-danger shadow-1 hover:opacity-95 active:opacity-90',
  gold:
    'bg-accent text-accent-fg border border-accent/40 shadow-1 hover:brightness-105 active:brightness-95',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  trailing,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, sizes[size], variants[variant], fullWidth && 'w-full', className)}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
      {trailing}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-transparent text-muted transition-colors duration-fast hover:text-fg hover:bg-surface2 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex min-h-[36px] items-center gap-1 text-sm font-semibold text-accent underline-offset-4 hover:underline cursor-pointer',
        className,
      )}
    >
      {children}
    </button>
  );
}
