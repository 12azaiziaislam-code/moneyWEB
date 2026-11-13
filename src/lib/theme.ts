/** Page identity + accent colour, persisted locally (never a secret). */

import { useEffect } from 'react';

export type PageTheme = 'halal' | 'chats' | 'doctor' | 'accountant' | 'profile';
export type Accent = 'teal' | 'rose' | 'violet' | 'amber' | 'cobalt' | 'emerald';
export type ThemeMode = 'system' | 'light' | 'dark';

export const ACCENTS: Accent[] = ['teal', 'rose', 'violet', 'amber', 'cobalt', 'emerald'];
export const ACCENT_SWATCH: Record<Accent, string> = {
  teal: '#0f766e',
  rose: '#be123c',
  violet: '#6d28d9',
  amber: '#a16207',
  cobalt: '#1d4ed8',
  emerald: '#047857',
};

const ACCENT_KEY = 'baraka.accent';
const THEME_KEY = 'baraka.theme';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function getStoredAccent(): Accent {
  const value = read(ACCENT_KEY);
  return ACCENTS.includes(value as Accent) ? (value as Accent) : 'teal';
}

export function getStoredTheme(): ThemeMode {
  const value = read(THEME_KEY);
  return value === 'dark' || value === 'system' ? value : 'light';
}

export function applyAccent(accent: Accent): void {
  document.documentElement.dataset.accent = accent;
  write(ACCENT_KEY, accent);
}

export function applyThemeMode(mode: ThemeMode): void {
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  write(THEME_KEY, mode);
}

export function applyPageTheme(theme: PageTheme): void {
  document.documentElement.dataset.theme = theme;
}

/** Wires the page identity (+ optional accent) for the lifetime of a screen. */
export function usePageTheme(theme: PageTheme, accent?: Accent): void {
  useEffect(() => {
    applyPageTheme(theme);
    if (accent) applyAccent(accent);
  }, [theme, accent]);
}

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}
