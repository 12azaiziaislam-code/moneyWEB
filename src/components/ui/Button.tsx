import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 font-semibold transition-[transform,background-color,border-color,box-shadow,color] duration-mid ease-out active:scale-[.97] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]';

const sizes: Record<Size, string> = {
  sm: 'min-h-[40px] rounded-md px-3 text-sm',
  md: 'min-h-[46px] rounded-lg px-4 text-[15px]',
  lg: 'min-h-[54px] rounded-xl px-5 text-base',
};

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg shadow-e2 hover:brightness-110 active:brightness-95',
  secondary:
    'bg-surface text-fg border border-line shadow-e1 hover:bg-surface2 active:bg-surface2',
  soft: 'bg-accent-soft text-accent hover:brightness-[0.97]',
  ghost: 'bg-transparent text-accent hover:bg-accent-soft/70',
  danger: 'bg-danger text-white shadow-e2 hover:brightness-110',
  gold: 'bg-[var(--accent-2)] text-[#1b1207] shadow-e2 hover:brightness-105',
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
      {loading ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden /> : icon}
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
        'inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent text-fg transition-colors duration-fast hover:bg-surface2 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]',
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
        'inline-flex min-h-[36px] items-center gap-1 text-sm font-semibold text-accent underline-offset-4 hover:underline',
        className,
      )}
    >
      {children}
    </button>
  );
}
