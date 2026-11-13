/**
 * Baraka v2 — Theme & Accent Management
 * Fully supports 'system' | 'light' | 'dark' with meta theme-color sync.
 */

import { useEffect } from 'react';

export type PageTheme = 'halal' | 'chats' | 'doctor' | 'accountant' | 'profile';
export type Accent = 'bronze' | 'sapphire' | 'amber' | 'amethyst';
export type ThemeMode = 'system' | 'light' | 'dark';

export const ACCENTS: Accent[] = ['bronze', 'sapphire', 'amber', 'amethyst'];
export const ACCENT_SWATCH: Record<Accent, { light: string; dark: string }> = {
  bronze: { light: '#9A7432', dark: '#E5C07B' },
  sapphire: { light: '#2563EB', dark: '#60A5FA' },
  amber: { light: '#D97706', dark: '#F59E0B' },
  amethyst: { light: '#7C3AED', dark: '#A78BFA' },
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

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function getStoredAccent(): Accent {
  const value = read(ACCENT_KEY);
  if (value && ACCENTS.includes(value as Accent)) return value as Accent;
  return 'bronze'; // Default to sovereign dune gold
}

export function getStoredTheme(): ThemeMode {
  const value = read(THEME_KEY);
  if (value === 'light' || value === 'system') return value;
  return 'dark'; // Default to sovereign dark
}

function updateThemeColorMeta(isDark: boolean) {
  const color = isDark ? '#0D1117' : '#FBF9F5';
  let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}

export function applyAccent(accent: Accent): void {
  document.documentElement.dataset.accent = accent;
  write(ACCENT_KEY, accent);
}

export function applyThemeMode(mode: ThemeMode): void {
  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
  updateThemeColorMeta(dark);
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
