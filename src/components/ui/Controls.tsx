/** Segmented control (sliding thumb) + accessible switch. */

import { useRef, type ReactNode } from 'react';
import { cn } from './cn';

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
      className={cn('relative flex rounded-full border border-line bg-surface2 p-1', className)}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 rounded-full bg-surface shadow-e1 transition-all duration-slow ease-spring"
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
              'relative z-[1] flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold transition-colors duration-mid',
              active ? 'text-fg' : 'text-muted',
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
    <label
      className={cn(
        'flex min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-md px-1 py-2',
        disabled && 'opacity-50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{label}</span>
        {description ? <span className="mt-0.5 block text-[12px] text-muted">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-[30px] w-[52px] shrink-0 rounded-full border transition-colors duration-mid',
          checked ? 'border-transparent bg-accent' : 'border-line bg-surface2',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-e1 transition-all duration-slow ease-spring',
            checked ? 'start-[27px]' : 'start-[3px]',
          )}
        />
      </button>
    </label>
  );
}
