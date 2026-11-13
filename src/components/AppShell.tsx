/**
 * Baraka v2 — Responsive App Shell
 * Mobile: Adaptive bottom tab bar with safe-area padding and zero overlap.
 * Desktop (>=1024px): Sovereign side navigation rail with brand header and status.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CloudOff,
  MessagesSquare,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Wallet,
  Sun,
  Moon,
} from 'lucide-react';
import { applyServiceWorkerUpdate, initInstallPrompt, registerServiceWorker } from '../lib/pwa';
import { cn } from './ui';
import { Button } from './ui/Button';
import { IslamicPattern } from './ui/IslamicPattern';
import { Logo } from './characters/Logo';
import { useAuth } from '../state/AuthContext';
import { systemPrefersDark } from '../lib/theme';
import type { LucideIcon } from 'lucide-react';

const NAV: Array<{ to: string; key: string; Icon: LucideIcon; end?: boolean }> = [
  { to: '/', key: 'halal', Icon: ShieldCheck, end: true },
  { to: '/chats', key: 'chats', Icon: MessagesSquare },
  { to: '/doctor', key: 'doctor', Icon: Stethoscope },
  { to: '/accountant', key: 'accountant', Icon: Wallet },
  { to: '/profile', key: 'profile', Icon: UserRound },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { role, signIn, themeMode, setThemeMode } = useAuth();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    initInstallPrompt();
    registerServiceWorker(() => setUpdateReady(true));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark());
  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-bg text-fg flex flex-col lg:flex-row">
      {/* Sovereign Sacred Geometry Backdrop (Zero Performance Drag) */}
      <IslamicPattern />

      {/* Offline Alert Strip */}
      {!online ? (
        <div
          role="status"
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-warn px-4 py-2 text-center text-xs font-bold text-white shadow-sm"
        >
          <CloudOff className="h-4 w-4" aria-hidden />
          <span>{t('common.offline')}</span>
        </div>
      ) : null}

      {/* PWA Update Banner */}
      {updateReady ? (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5 text-xs text-fg shadow-e2">
          <span>{t('common.update')}</span>
          <button
            type="button"
            onClick={applyServiceWorkerUpdate}
            className="rounded-md bg-accent px-3 py-1 font-bold text-accent-fg hover:opacity-90 cursor-pointer"
          >
            {t('common.reload')}
          </button>
        </div>
      ) : null}

      {/* =====================================================================
          DESKTOP SIDE NAVIGATION RAIL (>= 1024px)
          ===================================================================== */}
      <aside
        aria-label="القائمة الجانبية"
        className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col justify-between border-e border-line bg-surface/90 backdrop-blur-md z-30 sticky top-0 h-[100dvh] p-5 shadow-sm"
      >
        <div className="space-y-6">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-e1">
              <Logo size={28} />
            </div>
            <div className="min-w-0">
              <span className="font-display text-lg font-bold tracking-tight text-fg block leading-none">
                {t('app.name')}
              </span>
              <span className="text-[11px] font-semibold text-muted tracking-normal mt-0.5 block truncate">
                {t('app.tagline')}
              </span>
            </div>
          </div>

          {/* Guest Advisory Strip in Rail */}
          {role === 'guest' ? (
            <div className="rounded-lg border border-warn/30 bg-warn-soft/40 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-warn">
                <span className="h-2 w-2 rounded-full bg-warn animate-pulse" />
                <span>{t('guest.badge')}</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">{t('guest.localOnly')}</p>
              <button
                type="button"
                onClick={() => void signIn()}
                className="w-full text-center text-xs font-bold text-accent hover:underline py-1 cursor-pointer"
              >
                {t('guest.signInToSave')}
              </button>
            </div>
          ) : null}

          {/* Navigation Links */}
          <nav aria-label="تنقل الصفحات">
            <ul className="space-y-1">
              {NAV.map(({ to, key, Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all duration-fast cursor-pointer',
                        isActive
                          ? 'bg-surface2 text-fg border border-line shadow-sm'
                          : 'text-muted hover:text-fg hover:bg-surface2/60',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn('h-5 w-5 shrink-0 transition-transform', isActive ? 'text-accent scale-105' : 'text-muted')}
                          strokeWidth={isActive ? 2.2 : 1.75}
                          aria-hidden
                        />
                        <span className="truncate flex-1">{t(`nav.${key}`)}</span>
                        {isActive ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Footer in Rail: Theme Toggle & Info */}
        <div className="border-t border-line/60 pt-4 flex items-center justify-between text-xs text-muted">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-surface2 text-fg font-semibold cursor-pointer transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4 text-[var(--accent-2)]" /> : <Moon className="h-4 w-4 text-accent" />}
            <span>{isDark ? t('theme.light') : t('theme.dark')}</span>
          </button>
          <span className="text-[10px] text-muted-soft">v1.0.0</span>
        </div>
      </aside>

      {/* =====================================================================
          MAIN CONTENT WORKSPACE
          ===================================================================== */}
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col w-full max-w-full lg:max-w-[calc(100vw-16rem)] xl:max-w-[calc(100vw-18rem)]">
        {/* Guest Banner on Mobile */}
        {role === 'guest' ? (
          <div className="lg:hidden mx-3 mt-3 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface/90 px-3.5 py-2 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 rounded bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                {t('guest.badge')}
              </span>
              <p className="min-w-0 truncate text-xs text-muted">{t('guest.localOnly')}</p>
            </div>
            <button
              type="button"
              onClick={() => void signIn()}
              className="shrink-0 text-xs font-bold text-accent hover:underline cursor-pointer"
            >
              {t('guest.signInToSave')}
            </button>
          </div>
        ) : null}

        {/* Page View Wrapper (Spacious on desktop) */}
        <main className="flex-1 flex flex-col w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-[calc(var(--nav-h)+2rem+var(--safe-bottom))] lg:pb-12 safe-x">
          {children}
        </main>
      </div>

      {/* =====================================================================
          MOBILE BOTTOM FLOATING TAB BAR (< 1024px)
          Never overlaps modals, respects safe-area insets.
          ===================================================================== */}
      <nav
        aria-label={t('app.name')}
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg px-3 pb-[calc(0.5rem+var(--safe-bottom))]"
      >
        <ul className="flex items-center justify-between gap-1 rounded-xl border border-line bg-surface/95 backdrop-blur-md p-1.5 shadow-e2">
          {NAV.map(({ to, key, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[10.5px] font-bold transition-all duration-fast cursor-pointer',
                    isActive
                      ? 'bg-surface2 text-fg border border-line/60 shadow-xs'
                      : 'text-muted hover:text-fg hover:bg-surface2/50',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn('h-5 w-5 transition-transform', isActive ? 'text-accent scale-105' : 'text-muted')}
                      strokeWidth={isActive ? 2.2 : 1.75}
                      aria-hidden
                    />
                    <span className="truncate">{t(`nav.${key}`)}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Page title block used by every screen. */
export function PageHeader({
  title,
  subtitle,
  action,
  ornament,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  ornament?: ReactNode;
}) {
  return (
    <header className="relative flex items-start justify-between gap-3 pb-3 pt-3 border-b border-line/60 mb-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-fg">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">{subtitle}</p> : null}
        {ornament}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function UpgradeInline({ label, onSignIn }: { label: string; onSignIn: () => void }) {
  return (
    <Button variant="soft" size="sm" onClick={onSignIn}>
      {label}
    </Button>
  );
}
