/**
 * Motion helpers built on Motion One (WAAPI). Transform/opacity only, short
 * durations, and everything is disabled when the user prefers reduced motion.
 */

import { animate, stagger as motionStagger } from 'motion';
import { prefersReducedMotion } from './haptics';

export { prefersReducedMotion };

type Bezier = [number, number, number, number];
const EASE_OUT: Bezier = [0.22, 1, 0.36, 1];

export const DURATION = {
  fast: 0.16,
  mid: 0.26,
  slow: 0.44,
  verdict: 0.7,
} as const;

export function riseIn(element: Element | null, delay = 0): void {
  if (!element || prefersReducedMotion()) return;
  animate(
    element,
    { transform: ['translateY(10px)', 'translateY(0px)'], opacity: [0, 1] },
    { duration: DURATION.mid, delay, ease: EASE_OUT },
  );
}

export function popIn(element: Element | null, delay = 0): void {
  if (!element || prefersReducedMotion()) return;
  animate(
    element,
    { transform: ['scale(.86)', 'scale(1.03)', 'scale(1)'], opacity: [0, 1, 1] },
    { duration: DURATION.slow, delay, ease: EASE_OUT },
  );
}

export function staggerRise(container: Element | null, selector = '[data-stagger]'): void {
  if (!container || prefersReducedMotion()) return;
  const items = Array.from(container.querySelectorAll(selector));
  if (!items.length) return;
  animate(
    items,
    { transform: ['translateY(14px)', 'translateY(0px)'], opacity: [0, 1] },
    { duration: DURATION.mid, delay: motionStagger(0.045), ease: EASE_OUT },
  );
}

export function shake(element: Element | null): void {
  if (!element || prefersReducedMotion()) return;
  animate(
    element,
    { transform: ['translateX(0px)', 'translateX(-5px)', 'translateX(5px)', 'translateX(-3px)', 'translateX(0px)'] },
    { duration: 0.42, ease: [0.36, 0.07, 0.19, 0.97] },
  );
}

/** Bloom for the halal verdict. */
export function bloom(element: Element | null): void {
  if (!element || prefersReducedMotion()) return;
  animate(
    element,
    { transform: ['scale(.5)', 'scale(1.06)', 'scale(1)'], opacity: [0, 1, 1] },
    { duration: DURATION.verdict, ease: EASE_OUT },
  );
}

/** Heavy stamp for the haram verdict. */
export function stamp(element: Element | null): void {
  if (!element || prefersReducedMotion()) return;
  animate(
    element,
    { transform: ['scale(1.7) rotate(-8deg)', 'scale(.96) rotate(-2deg)', 'scale(1) rotate(-3deg)'], opacity: [0, 1, 1] },
    { duration: 0.55, ease: EASE_OUT },
  );
}

/** Count-up for money figures (tabular alignment comes from the .num class). */
export function countUp(
  element: HTMLElement | null,
  to: number,
  format: (value: number) => string,
  durationMs = 620,
): void {
  if (!element) return;
  if (prefersReducedMotion() || to === 0) {
    element.textContent = format(to);
    return;
  }
  const from = Number(element.dataset.valueRaw ?? '0');
  const started = performance.now();
  element.dataset.valueRaw = String(to);
  const tick = (now: number) => {
    const progress = Math.min(1, (now - started) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = format(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function slideIn(element: Element | null, from: 'start' | 'end'): void {
  if (!element || prefersReducedMotion()) return;
  const rtl = document.documentElement.dir === 'rtl';
  const sign = (from === 'end' ? 1 : -1) * (rtl ? -1 : 1);
  animate(
    element,
    { transform: [`translateX(${sign * 24}px)`, 'translateX(0px)'], opacity: [0, 1] },
    { duration: DURATION.mid, ease: EASE_OUT },
  );
}
