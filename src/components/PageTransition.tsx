/**
 * Baraka v2 — Fluid Page Transitions
 * Uses View Transitions API when available, with a GPU-accelerated fallback.
 * Cleans up transform styles on animation completion so fixed children remain unaffected.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { prefersReducedMotion } from '../lib/motion';

export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (prefersReducedMotion()) {
      element.style.opacity = '1';
      element.style.transform = 'none';
      return;
    }

    const anim = element.animate?.(
      [
        { opacity: 0, transform: 'translate3d(0, 6px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );

    if (anim) {
      anim.onfinish = () => {
        if (ref.current) {
          ref.current.style.transform = '';
          ref.current.style.opacity = '';
        }
      };
    }
  }, [pathname]);

  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col w-full h-full">
      {children}
    </div>
  );
}

/** Wraps a navigation callback in document.startViewTransition when supported. */
export function withViewTransition(action: () => void): void {
  const doc = document as Document & { startViewTransition?: (callback: () => void) => void };
  if (prefersReducedMotion() || typeof doc.startViewTransition !== 'function') {
    action();
    return;
  }
  doc.startViewTransition(action);
}
