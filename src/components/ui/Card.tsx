/** Cards, section headers and small layout primitives. */

import type { ReactNode } from 'react';
import { cn } from './cn';

export { cn };

export function Card({
  children,
  className,
  tone = 'default',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'soft' | 'accent' | 'glass';
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  const tones = {
    default: 'bg-surface border border-line shadow-e2',
    soft: 'bg-surface2 border border-line',
    accent: 'bg-accent-soft border border-transparent',
    glass: 'glass-surface shadow-e2',
  } as const;
  return <Tag className={cn('rounded-lg', tones[tone], className)}>{children}</Tag>;
}

export function SectionHeader({
  title,
  action,
  icon,
  className,
}: {
  title: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-2 flex items-center justify-between gap-2', className)}>
      <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.09em] text-muted">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-line', className)} role="separator" />;
}

export function KeyValue({ k, v, tone }: { k: string; v: ReactNode; tone?: 'ok' | 'warn' | 'danger' }) {
  const tones = {
    ok: 'text-ok',
    warn: 'text-warn',
    danger: 'text-danger',
  } as const;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="text-muted">{k}</dt>
      <dd className={cn('num font-semibold', tone ? tones[tone] : 'text-fg')}>{v}</dd>
    </div>
  );
}
