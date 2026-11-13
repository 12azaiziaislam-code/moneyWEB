/** Bottom sheet with backdrop, drag-to-dismiss and escape handling. */

import { useEffect, useRef, type ReactNode } from 'react';
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
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (!prefersReducedMotion()) {
      if (panelRef.current) {
        animate(
          panelRef.current,
          { transform: ['translateY(26px)', 'translateY(0px)'], opacity: [0, 1] },
          { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
        );
      }
      if (backdropRef.current) {
        animate(backdropRef.current, { opacity: [0, 1] }, { duration: 0.24 });
      }
    }

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button
        ref={backdropRef}
        type="button"
        aria-label="close"
        tabIndex={-1}
        className="absolute inset-0 bg-[var(--overlay)]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full max-w-app overflow-y-auto rounded-t-2xl border border-line bg-surface px-4 pb-[calc(1rem+var(--safe-bottom))] pt-2 shadow-e3',
          size === 'tall' ? 'max-h-[92dvh]' : 'max-h-[86dvh]',
        )}
      >
        <div className="mx-auto mb-2 h-1.5 w-11 rounded-full bg-line" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <IconButton label="close" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden />
          </IconButton>
        </div>
        <div className="space-y-3">{children}</div>
        {footer ? <div className="mt-4 space-y-2">{footer}</div> : null}
      </div>
    </div>
  );
}
