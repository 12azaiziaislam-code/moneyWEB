/**
 * Baraka — App Shell
 *
 * Information architecture (one place for everything):
 *   Tools   : Home · Halal · Doctor · Accountant · History(chats)
 *   Account : reached from the avatar (mobile top bar / desktop rail footer)
 *
 * Mobile  (< 1024px): sticky top bar (brand + theme + avatar) and a 5-item bottom tab bar.
 * Desktop (>= 1024px): fixed side rail with grouped navigation and a user card.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CloudOff,
  History,
  Home,
  Moon,
  ShieldCheck,
  Stethoscope,
  Sun,
  Wallet,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react';
import { applyServiceWorkerUpdate, initInstallPrompt, registerServiceWorker } from '../lib/pwa';
import { cn } from './ui';
import { Button } from './ui/Button';
import { IslamicPattern } from './ui/IslamicPattern';
import { Logo } from './characters/Logo';
import { useAuth } from '../state/AuthContext';
import { useScan } from '../state/ScanContext';
import { systemPrefersDark } from '../lib/theme';

interface NavItem {
  to: string;
  key: string;
  Icon: LucideIcon;
  end?: boolean;
  /** Tool identity color (CSS var) for the active state. */
  tone: string;
}

const NAV: NavItem[] = [
  { to: '/', key: 'home', Icon: Home, end: true, tone: 'var(--accent)' },
  { to: '/halal', key: 'halal', Icon: ShieldCheck, tone: 'var(--tool-halal)' },
  { to: '/doctor', key: 'doctor', Icon: Stethoscope, tone: 'var(--tool-doctor)' },
  { to: '/accountant', key: 'accountant', Icon: Wallet, tone: 'var(--tool-money)' },
  { to: '/chats', key: 'history', Icon: History, tone: 'var(--accent)' },
];

/* -------------------------------------------------------------------------- */
/* Avatar used in the top bar and the rail                                    */
/* -------------------------------------------------------------------------- */
export function UserAvatar({ size = 36, className }: { size?: number; className?: string }) {
  const { t } = useTranslation();
  const { role, user } = useAuth();
  const isGuest = role === 'guest';
  const photo = user && 'photoURL' in user ? (user as { photoURL?: string }).photoURL : undefined;
  const label = isGuest ? t('guest.badge') : user?.displayName || user?.email || '';
  const initial = (isGuest ? t('nav2.guestInitial') : label.trim().slice(0, 1) || '•').toUpperCase();

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold',
        isGuest ? 'bg-surface2 text-muted ring-1 ring-line' : 'bg-accent text-accent-fg',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden
    >
      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const isChatDetail = path.startsWith('/chats/');
  const { role, user, signIn, themeMode, setThemeMode } = useAuth();
  const { busy: halalBusy } = useScan();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const isGuest = role === 'guest';

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

  // Each tab is kept alive, so reset the scroll position when switching tabs.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.getElementById('app-scroll')?.scrollTo({ top: 0 });
  }, [path]);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark());
  const toggleTheme = () => setThemeMode(isDark ? 'light' : 'dark');
  const profileActive = path.startsWith('/profile');
  const displayName = isGuest ? t('guest.badge') : user?.displayName || user?.email?.split('@')[0] || t('nav.profile');

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col bg-bg text-fg lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      <IslamicPattern />

      {/* System strips */}
      {!online ? (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-warn px-4 py-2 text-center text-xs font-bold text-warn-fg"
        >
          <CloudOff className="h-4 w-4" aria-hidden />
          <span>{t('common.offline')}</span>
        </div>
      ) : null}
      {updateReady ? (
        <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5 text-xs text-fg shadow-e2">
          <span>{t('common.update')}</span>
          <Button size="sm" onClick={applyServiceWorkerUpdate}>
            {t('common.reload')}
          </Button>
        </div>
      ) : null}

      {/* ==================================================================
          DESKTOP RAIL
          ================================================================== */}
      <aside
        aria-label={t('nav2.menu')}
        className="z-30 hidden h-full w-[17rem] shrink-0 flex-col border-e border-line bg-surface/80 backdrop-blur-xl lg:flex"
      >
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <Logo size={40} className="shrink-0 rounded-xl shadow-e1" />
          <div className="min-w-0">
            <span className="block font-display text-lg font-bold leading-none text-fg">{t('app.name')}</span>
            <span className="mt-1.5 block truncate text-xs text-muted">{t('nav2.shortTagline')}</span>
          </div>
        </div>

        <nav aria-label={t('nav2.menu')} className="flex-1 overflow-y-auto px-3 no-scrollbar">
          <p className="px-3 pb-2 pt-2 text-xs font-semibold text-muted-soft">{t('nav2.tools')}</p>
          <ul className="space-y-1">
            {NAV.slice(0, 4).map((item) => (
              <RailLink key={item.to} item={item} busy={halalBusy && item.key === 'halal'} />
            ))}
          </ul>
          <p className="px-3 pb-2 pt-6 text-xs font-semibold text-muted-soft">{t('nav2.records')}</p>
          <ul className="space-y-1">
            <RailLink item={NAV[4]} />
          </ul>

          {isGuest ? (
            <div className="mx-1 mt-6 rounded-lg border border-line bg-surface2/60 p-4">
              <p className="text-sm font-bold text-fg">{t('home2.guestTitle')}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t('guest.localOnly')}</p>
              <Button size="sm" fullWidth className="mt-3" onClick={() => void signIn()}>
                {t('home2.guestCta')}
              </Button>
            </div>
          ) : null}
        </nav>

        {/* User card */}
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-1">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-1 items-center gap-3 rounded-md px-2.5 py-2 transition-colors',
                  isActive ? 'bg-surface2' : 'hover:bg-surface2/70',
                )
              }
            >
              <UserAvatar size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-fg">{displayName}</span>
                <span className="block truncate text-xs text-muted">{t('nav2.accountSettings')}</span>
              </span>
            </NavLink>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? t('theme.light') : t('theme.dark')}
              title={isDark ? t('theme.light') : t('theme.dark')}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface2 hover:text-fg"
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>
      </aside>

      {/* ==================================================================
          MAIN COLUMN
          ================================================================== */}
      <div
        id="app-scroll"
        className={cn(
          'relative z-[1] flex min-h-0 w-full flex-1 flex-col lg:h-full',
          isChatDetail ? 'lg:overflow-hidden' : 'lg:overflow-y-auto',
        )}
      >
        {/* Mobile top bar */}
        {!isChatDetail ? (
          <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-xl safe-top lg:hidden">
            <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
              <button type="button" onClick={() => navigate('/')} className="flex min-w-0 items-center gap-2.5">
                <Logo size={30} className="shrink-0 rounded-lg" />
                <span className="font-display text-base font-bold text-fg">{t('app.name')}</span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={isDark ? t('theme.light') : t('theme.dark')}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-fg"
                >
                  {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  aria-label={t('nav.profile')}
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-full transition-shadow',
                    profileActive && 'ring-2 ring-accent ring-offset-2 ring-offset-bg',
                  )}
                >
                  <UserAvatar size={32} />
                </button>
              </div>
            </div>
          </header>
        ) : null}

        <main
          className={cn(
            'mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 safe-x sm:px-6 lg:max-w-5xl lg:px-10 xl:max-w-6xl',
            isChatDetail
              ? 'h-full min-h-0 pb-2 pt-2 sm:pb-3 lg:pt-6'
              : 'pb-[calc(var(--nav-h)+2.5rem+var(--safe-bottom))] pt-5 lg:pb-16 lg:pt-10',
          )}
        >
          {children}
        </main>
      </div>

      {/* ==================================================================
          MOBILE BOTTOM TAB BAR
          ================================================================== */}
      {!isChatDetail ? (
        <nav
          aria-label={t('nav2.menu')}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/90 pb-[var(--safe-bottom)] backdrop-blur-xl lg:hidden"
        >
          <ul className="mx-auto flex h-[var(--nav-h)] max-w-lg items-stretch justify-between px-2">
            {NAV.map(({ to, key, Icon, end, tone }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                      isActive ? 'text-fg' : 'text-muted hover:text-fg',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'relative flex h-8 w-14 items-center justify-center rounded-full transition-all duration-mid',
                          isActive ? 'scale-100' : 'scale-90',
                        )}
                        style={isActive ? { background: `color-mix(in srgb, ${tone} 16%, transparent)` } : undefined}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={isActive ? { color: tone } : undefined}
                          strokeWidth={isActive ? 2.2 : 1.8}
                          aria-hidden
                        />
                        {halalBusy && key === 'halal' && !isActive ? (
                          <span className="absolute end-3 top-1 h-2 w-2 animate-pulse rounded-full bg-tool-halal" />
                        ) : null}
                      </span>
                      <span className="truncate">{t(key === 'history' ? 'nav2.history' : `nav.${key}`)}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

function RailLink({ item, busy = false }: { item: NavItem; busy?: boolean }) {
  const { t } = useTranslation();
  const { to, key, Icon, end, tone } = item;
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors',
            isActive ? 'bg-surface2 text-fg' : 'text-muted hover:bg-surface2/60 hover:text-fg',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <span className="absolute inset-y-2 start-0 w-[3px] rounded-full" style={{ background: tone }} aria-hidden />
            ) : null}
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors"
              style={{
                background: isActive ? `color-mix(in srgb, ${tone} 15%, transparent)` : undefined,
                color: isActive ? tone : undefined,
              }}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
            </span>
            <span className="flex-1 truncate">{t(key === 'history' ? 'nav2.history' : `nav.${key}`)}</span>
            {busy ? <span className="h-2 w-2 animate-pulse rounded-full bg-tool-halal" aria-hidden /> : null}
          </>
        )}
      </NavLink>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Page header — one consistent title block for every screen                   */
/* -------------------------------------------------------------------------- */
export function PageHeader({
  title,
  subtitle,
  action,
  ornament,
  icon,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  ornament?: ReactNode;
  /** Persona or icon shown before the title. */
  icon?: ReactNode;
  /** Small label above the title. */
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {icon ? <div className="shrink-0">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="mb-1 text-xs font-semibold text-muted">{eyebrow}</p> : null}
          <h1 className="font-display text-[1.6rem] font-bold leading-tight text-fg sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-muted">{subtitle}</p> : null}
          {ornament}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}

/** Section title inside a page. */
export function SectionTitle({
  title,
  action,
  hint,
}: {
  title: ReactNode;
  action?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold text-fg">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Inline "view all" style link with a direction-aware chevron. */
export function MoreLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-accent hover:underline"
    >
      {children}
      <ChevronLeft className="h-4 w-4 ltr:rotate-180" aria-hidden />
    </button>
  );
}

export function UpgradeInline({ label, onSignIn }: { label: string; onSignIn: () => void }) {
  return (
    <Button variant="soft" size="sm" onClick={onSignIn}>
      {label}
    </Button>
  );
}
