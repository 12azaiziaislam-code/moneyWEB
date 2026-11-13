/**
 * Baraka v2 — Form Controls: SegmentedControl, OptionCard, RadioGroup, ThemeSelector, and Switch
 * Fully accessible, touch-friendly, RTL compliant, WCAG 4.5:1+ contrast.
 */

import { useRef, type ReactNode } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { cn } from './cn';
import type { ThemeMode } from '../../lib/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const width = 100 / options.length;

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn('relative flex rounded-md border border-line bg-surface2/80 p-1', className)}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 rounded bg-surface shadow-e1 transition-all duration-slow ease-spring"
        style={{
          width: `calc(${width}% - 4px)`,
          insetInlineStart: `calc(${index * width}% + 2px)`,
        }}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-[1] flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded px-2 text-xs sm:text-[13.5px] font-bold transition-colors duration-fast cursor-pointer',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const SegmentedControl = Segmented;

export function OptionCard<T extends string>({
  value,
  selected,
  onSelect,
  title,
  description,
  badge,
  icon,
  className,
}: {
  value: T;
  selected: boolean;
  onSelect: (value: T) => void;
  title: string;
  description?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      className={cn(
        'flex flex-col items-start w-full rounded-md border p-3.5 text-start transition-all cursor-pointer',
        selected
          ? 'border-accent bg-accent-soft/40 shadow-e1 ring-1 ring-accent'
          : 'border-line bg-surface hover:bg-surface2/80',
        className,
      )}
    >
      <div className="flex items-center justify-between w-full gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {icon ? <span className="text-accent shrink-0">{icon}</span> : null}
          <span className="font-display text-sm font-bold text-fg truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge}
          <div
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full border transition-colors',
              selected ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface2',
            )}
          >
            {selected ? <Check className="h-3 w-3 stroke-[3]" /> : null}
          </div>
        </div>
      </div>
      {description ? (
        <p className="text-xs text-muted leading-relaxed line-clamp-2">{description}</p>
      ) : null}
    </button>
  );
}

export function RadioGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: Array<{ value: T; title: string; description?: string; badge?: ReactNode; icon?: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('space-y-2', className)}>
      {options.map((opt) => (
        <OptionCard
          key={opt.value}
          value={opt.value}
          selected={value === opt.value}
          onSelect={onChange}
          title={opt.title}
          description={opt.description}
          badge={opt.badge}
          icon={opt.icon}
        />
      ))}
    </div>
  );
}

export function ThemeSelector({
  value,
  onChange,
  labels,
}: {
  value: ThemeMode;
  onChange: (val: ThemeMode) => void;
  labels: { system: string; light: string; dark: string };
}) {
  const options: Array<{ value: ThemeMode; label: string; icon: ReactNode }> = [
    { value: 'light', label: labels.light, icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: labels.dark, icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: labels.system, icon: <Laptop className="h-4 w-4" /> },
  ];

  return (
    <div className="flex gap-1.5 rounded-lg border border-line bg-surface2 p-1">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md py-2 px-2 text-xs font-bold transition-all cursor-pointer',
              active
                ? 'bg-surface text-fg shadow-e1 border border-line/60'
                : 'text-muted hover:text-fg hover:bg-surface/50 border border-transparent',
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Switch with visible status ("مفعّل" / "معطّل") and label directly adjacent
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'flex min-h-[50px] cursor-pointer items-center justify-between gap-3 rounded-md px-1 py-2 select-none',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="block text-sm font-bold text-fg">{label}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-bold border',
              checked
                ? 'border-ok/30 bg-ok-soft text-ok'
                : 'border-line bg-surface2 text-muted',
            )}
          >
            {checked ? 'مفعّل' : 'معطّل'}
          </span>
        </div>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted leading-relaxed">{description}</span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={cn(
          'relative h-[28px] w-[50px] shrink-0 rounded-full border transition-colors duration-mid cursor-pointer',
          checked ? 'border-accent bg-accent' : 'border-line bg-surface2',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-e1 transition-all duration-slow ease-spring',
            checked ? 'inset-inline-start-[24px]' : 'inset-inline-start-[2px]',
          )}
        />
      </button>
    </div>
  );
}
