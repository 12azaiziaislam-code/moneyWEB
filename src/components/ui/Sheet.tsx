/**
 * Baraka v2 — Sovereign Bottom Sheet & Modal
 * Rendered via createPortal to document.body:
 * 100% immune to transform containing-block trapping and stacking context bugs.
 * Never overlapped by bottom navigation.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { animate } from 'motion';
import { cn } from './cn';
import { IconButton } from './Button';
import { prefersReducedMotion } from '../../lib/motion';

export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'auto',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'auto' | 'tall';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (!prefersReducedMotion()) {
      if (panelRef.current) {
        animate(
          panelRef.current,
          { transform: ['translateY(100%)', 'translateY(0%)'], opacity: [0.6, 1] },
          { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
        );
      }
      if (backdropRef.current) {
        animate(backdropRef.current, { opacity: [0, 1] }, { duration: 0.22 });
      }
    }

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <button
        ref={backdropRef}
        type="button"
        aria-label="إغلاق النافذة"
        tabIndex={-1}
        className="fixed inset-0 bg-overlay backdrop-blur-[2px] transition-opacity cursor-pointer border-0"
        onClick={onClose}
      />

      {/* Sheet Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex flex-col w-full max-w-lg overflow-hidden',
          'rounded-t-2xl sm:rounded-2xl border border-line bg-surface shadow-e3',
          'transition-all duration-mid',
          size === 'tall' ? 'max-h-[90dvh] h-[90dvh]' : 'max-h-[85dvh]',
        )}
      >
        {/* Drag handle pill */}
        <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-border" aria-hidden="true" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line/60 px-5 py-3">
          <h2 className="font-display text-lg font-bold text-fg">{title}</h2>
          <IconButton label="إغلاق" onClick={onClose} className="text-muted hover:text-fg hover:bg-surface2">
            <X className="h-5 w-5" aria-hidden />
          </IconButton>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
          {children}
        </div>

        {/* Footer (Always visible above safe-area) */}
        {footer ? (
          <div className="shrink-0 border-t border-line/60 bg-surface2/60 px-5 py-3 pb-[calc(0.75rem+var(--safe-bottom))]">
            {footer}
          </div>
        ) : (
          <div className="h-[var(--safe-bottom)] shrink-0" />
        )}
      </div>
    </div>,
    document.body,
  );
}
