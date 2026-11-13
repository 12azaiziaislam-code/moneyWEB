/** Inputs with floating labels, 44px targets, RTL-safe logical padding. */

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

const control =
  'peer w-full rounded-md border border-line bg-surface px-4 pb-2.5 pt-6 text-base text-fg outline-none transition-[border-color,box-shadow,background-color] duration-mid placeholder:text-transparent focus:border-[var(--ring)] focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:opacity-60';

const labelBase =
  'pointer-events-none absolute start-4 origin-[0_50%] text-muted transition-all duration-mid ease-out';

function shellClasses(lifted: boolean): string {
  return lifted ? 'top-2 text-[11px] font-semibold' : 'top-[17px] text-base';
}

interface FieldShellProps {
  id: string;
  label: string;
  lifted: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  suffix?: ReactNode;
  counter?: string;
}

function FieldShell({ id, label, lifted, hint, error, children, suffix, counter }: FieldShellProps) {
  return (
    <div className="w-full">
      <div className="relative">
        {children}
        <label htmlFor={id} className={cn(labelBase, shellClasses(lifted))}>
          {label}
        </label>
        {suffix ? (
          <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted num">
            {suffix}
          </span>
        ) : null}
      </div>
      {(hint || error || counter) && (
        <div className="mt-1 flex items-start justify-between gap-2 px-1">
          <p className={cn('text-[12px] leading-snug', error ? 'text-danger' : 'text-muted')} role={error ? 'alert' : undefined}>
            {error || hint}
          </p>
          {counter ? <span className="num text-[11px] text-muted">{counter}</span> : null}
        </div>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, suffix, className, id, value, onFocus, onBlur, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  const lifted = focused || String(value ?? '').length > 0;

  return (
    <FieldShell id={fieldId} label={label} lifted={lifted} hint={hint} error={error} suffix={suffix}>
      <input
        ref={ref}
        id={fieldId}
        value={value}
        {...rest}
        className={cn(control, error && 'border-danger focus:shadow-[0_0_0_3px_var(--danger-soft)]', className)}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  counter?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, counter, className, id, value, onFocus, onBlur, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  const lifted = focused || String(value ?? '').length > 0;

  return (
    <FieldShell id={fieldId} label={label} lifted={lifted} hint={hint} error={error} counter={counter}>
      <textarea
        ref={ref}
        id={fieldId}
        value={value}
        rows={3}
        {...rest}
        className={cn(control, 'min-h-[104px] resize-y leading-relaxed', error && 'border-danger', className)}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Select({ label, hint, children, className, id, ...rest }: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} lifted hint={hint}>
      <select
        id={fieldId}
        {...rest}
        className={cn(control, 'appearance-none pe-10', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
        }}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md bg-surface2 p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-line accent-[var(--accent)]"
      />
      <span>
        <span className="font-semibold text-fg">{label}</span>
        {description ? <span className="mt-0.5 block text-[12px] text-muted">{description}</span> : null}
      </span>
    </label>
  );
}
