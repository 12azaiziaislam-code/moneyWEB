/**
 * Route transition: uses the View Transitions API when available (and not
 * reduced-motion), otherwise a 220ms fade/rise that follows the reading
 * direction. Only transform/opacity are animated.
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
    // CSS-driven fallback: cheap, GPU friendly, RTL agnostic.
    element.animate?.(
      [
        { opacity: 0, transform: 'translate3d(0, 10px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: 230, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' },
    );
  }, [pathname]);

  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col">
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
