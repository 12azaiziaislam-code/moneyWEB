/** Haptics with a user-controlled switch (Settings → feel) + reduced-motion guard. */

const STORAGE_KEY = 'baraka.haptics';
let enabled =
  typeof localStorage === 'undefined' ? true : (localStorage.getItem(STORAGE_KEY) ?? '1') === '1';

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function areHapticsEnabled(): boolean {
  return enabled;
}

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
  try {
    // UI preference only — never a secret.
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* private mode */
  }
}

export const HAPTIC: Record<'tap' | 'select' | 'success' | 'warning' | 'danger' | 'heavy', number | number[]> = {
  tap: 8,
  select: 12,
  success: [16, 34, 18],
  warning: [22, 50, 22],
  danger: [34, 60, 34, 60, 50],
  heavy: [60],
};

/** Short vibration for meaningful moments only; silently ignored when unsupported. */
export function haptic(pattern: number | number[] = HAPTIC.tap): void {
  if (!enabled || prefersReducedMotion()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
