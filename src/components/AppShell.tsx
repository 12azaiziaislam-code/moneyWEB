/**
 * App Shell: Responsive container, institutional navigation, guest banner, offline notice.
 * Designed for mobile (360px) through desktop (1280px+).
 */

import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CloudOff, Library, ShieldCheck, Stethoscope, UserRound, Wallet } from 'lucide-react';
import { applyServiceWorkerUpdate, initInstallPrompt, registerServiceWorker } from '../lib/pwa';
import { cn } from './ui';
import { Button } from './ui/Button';
import { IslamicPattern } from './ui/IslamicPattern';
import { useAuth } from '../state/AuthContext';

import type { LucideIcon } from 'lucide-react';

const NAV: Array<{ to: string; key: string; Icon: LucideIcon; end?: boolean }> = [
  { to: '/', key: 'halal', Icon: ShieldCheck, end: true },
  { to: '/chats', key: 'chats', Icon: Library },
  { to: '/doctor', key: 'doctor', Icon: Stethoscope },
  { to: '/accountant', key: 'accountant', Icon: Wallet },
  { to: '/profile', key: 'profile', Icon: UserRound },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { role, signIn } = useAuth();
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

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col bg-bg text-fg">
      {/* Sovereign Sacred Geometry Backdrop & Ambient Illumination */}
      <IslamicPattern />

      {!online ? (
        <div
          role="status"
          className="safe-top relative z-10 flex items-center justify-center gap-2 bg-warn px-4 py-2 text-center text-xs font-semibold text-white shadow-sm"
        >
          <CloudOff className="h-4 w-4" aria-hidden />
          <span>{t('common.offline')}</span>
        </div>
      ) : null}

      {updateReady ? (
        <div className="relative z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5 text-xs text-fg">
          <span>{t('common.update')}</span>
          <button
            type="button"
            onClick={applyServiceWorkerUpdate}
            className="rounded-md bg-accent px-3 py-1 font-bold text-accent-fg hover:opacity-90"
          >
            {t('common.reload')}
          </button>
        </div>
      ) : null}

      {role === 'guest' ? (
        <div className="relative z-10 mx-3 mt-3 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3.5 py-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 rounded bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
              {t('guest.badge')}
            </span>
            <p className="min-w-0 truncate text-xs text-muted">{t('guest.localOnly')}</p>
          </div>
          <button
            type="button"
            onClick={() => void signIn()}
            className="shrink-0 text-xs font-bold text-accent hover:underline underline-offset-4"
          >
            {t('guest.signInToSave')}
          </button>
        </div>
      ) : null}

      <main className="relative z-[1] flex min-h-0 flex-1 flex-col px-3.5 pb-[calc(var(--nav-h)+2rem+var(--safe-bottom))] pt-3 sm:px-6 safe-x">
        {children}
      </main>

      <nav
        aria-label={t('app.name')}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl md:max-w-2xl px-3 pb-[calc(0.5rem+var(--safe-bottom))]"
      >
        <ul className="institutional-nav flex items-center justify-between gap-1 p-1.5">
          {NAV.map(({ to, key, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold transition-colors duration-fast',
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : 'text-muted hover:text-fg hover:bg-surface2',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn('h-5 w-5 transition-transform', isActive && 'scale-105')}
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
    <header className="relative flex items-start justify-between gap-3 pb-3 pt-3 border-b border-line/60 mb-3">
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
