/** App shell: 480px column, floating glass bottom nav, guest banner, offline hint. */

import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CloudOff, Library, MoonStar, Stethoscope, UserRound, Wallet } from 'lucide-react';
import { applyServiceWorkerUpdate, initInstallPrompt, registerServiceWorker } from '../lib/pwa';
import { cn } from './ui';
import { Button } from './ui/Button';
import { useAuth } from '../state/AuthContext';

import type { LucideIcon } from 'lucide-react';

const NAV: Array<{ to: string; key: string; Icon: LucideIcon; end?: boolean }> = [
  { to: '/', key: 'halal', Icon: MoonStar, end: true },
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
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col bg-bg">
      <div className="pointer-events-none fixed inset-0 mx-auto max-w-5xl overflow-hidden">
        <div className="pattern-islamic absolute inset-0" />
      </div>

      {!online ? (
        <div
          role="status"
          className="safe-top relative z-10 flex items-center justify-center gap-2 bg-warn px-3 py-1.5 text-center text-[12px] font-semibold text-white"
        >
          <CloudOff className="h-4 w-4" aria-hidden />
          {t('common.offline')}
        </div>
      ) : null}

      {updateReady ? (
        <div className="relative z-10 flex items-center justify-between gap-2 bg-fg px-3 py-2 text-[12px] text-bg">
          <span>{t('common.update')}</span>
          <button
            type="button"
            onClick={applyServiceWorkerUpdate}
            className="rounded-full bg-[var(--accent-2)] px-3 py-1 font-bold text-[#1b1207]"
          >
            {t('common.reload')}
          </button>
        </div>
      ) : null}

      {role === 'guest' ? (
        <div className="relative z-10 mx-3 mt-2 flex items-center gap-2 rounded-md border border-line bg-surface2 px-3 py-2">
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">{t('guest.badge')}</span>
          <p className="min-w-0 flex-1 truncate text-[11px] text-muted">{t('guest.localOnly')}</p>
          <button
            type="button"
            onClick={() => void signIn()}
            className="shrink-0 text-[11px] font-bold text-accent underline-offset-2 hover:underline"
          >
            {t('guest.signInToSave')}
          </button>
        </div>
      ) : null}

      <main className="relative z-[1] flex min-h-0 flex-1 flex-col px-3 pb-[calc(var(--nav-h)+1.75rem+var(--safe-bottom))] pt-2 safe-x">
        {children}
      </main>

      <nav
        aria-label={t('app.name')}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl md:max-w-2xl px-3 pb-[calc(0.5rem+var(--safe-bottom))]"
      >
        <ul className="glass-surface flex items-center justify-between gap-1 rounded-2xl px-1.5 py-1.5 shadow-e3">
          {NAV.map(({ to, key, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold transition-all duration-mid',
                    isActive ? 'text-accent' : 'text-muted hover:text-fg',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'absolute inset-x-2 top-1 h-[3px] rounded-full bg-accent transition-opacity duration-mid',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden="true"
                    />
                    <Icon
                      className={cn('h-[22px] w-[22px] transition-transform duration-mid', isActive && '-translate-y-[1px] scale-105')}
                      strokeWidth={isActive ? 2.4 : 1.9}
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
    <header className="flex items-start justify-between gap-2 pb-1 pt-2">
      <div className="min-w-0">
        <h1 className="text-display text-[22px] font-extrabold leading-tight text-fg">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[13px] leading-snug text-muted">{subtitle}</p> : null}
        {ornament}
      </div>
      {action}
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
