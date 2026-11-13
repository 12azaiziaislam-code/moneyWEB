/**
 * Cards, SectionCard, ListItem and layout primitives.
 * Compliant with 16px card radius and no tracking/uppercase on Arabic text.
 */

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
    default: 'bg-surface border border-line shadow-e1',
    soft: 'bg-surface2 border border-line',
    accent: 'bg-accent-soft border border-transparent',
    glass: 'glass-surface shadow-e1',
  } as const;
  return <Tag className={cn('rounded-lg p-4 sm:p-5', tones[tone], className)}>{children}</Tag>;
}

export function SectionCard({
  title,
  subtitle,
  action,
  icon,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-line bg-surface p-4 sm:p-5 shadow-e1', className)}>
      {title || action || icon ? (
        <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon ? <span className="text-accent shrink-0">{icon}</span> : null}
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-fg truncate">{title}</h2>
              {subtitle ? <p className="text-xs text-muted truncate mt-0.5">{subtitle}</p> : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div>{children}</div>
    </section>
  );
}

export function ListItem({
  title,
  subtitle,
  icon,
  end,
  onClick,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  end?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const isClickable = Boolean(onClick);
  const Tag = isClickable ? 'button' : 'div';
  return (
    <Tag
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-start transition-colors',
        isClickable && 'hover:bg-surface2 active:bg-surface2 cursor-pointer',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon ? <div className="shrink-0 text-muted">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-fg truncate">{title}</div>
          {subtitle ? <div className="text-xs text-muted truncate mt-0.5">{subtitle}</div> : null}
        </div>
      </div>
      {end ? <div className="shrink-0">{end}</div> : null}
    </Tag>
  );
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
    <div className={cn('mb-2.5 flex items-center justify-between gap-2', className)}>
      <h2 className="flex items-center gap-1.5 text-xs font-bold text-muted">
        {icon}
        <span>{title}</span>
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
      <dd className={cn('num font-semibold', tone ? tones[tone] : 'text-fg')}>
        <bdi dir="auto">{v}</bdi>
      </dd>
    </div>
  );
}
