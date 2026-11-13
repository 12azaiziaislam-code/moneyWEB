/**
 * Session state for both roles:
 *  - user  : Firebase (Google) + the worker row (WebUser) is the source of truth
 *  - guest : anonymous token + guest data that never leaves this device
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import type { WebUser } from '../../shared/types';
import {
  ApiError,
  apiFetch,
  apiLogin,
  apiRegister,
  clearSessionToken,
  loadGuestToken,
  loadSessionToken,
  setGuestToken,
  startGuestSession,
} from '../lib/api';
import {
  completeRedirectSignIn,
  firebaseConfigured,
  firebaseSignOut,
  signInWithGoogle,
  watchAuth,
} from '../lib/firebase';
import { CacheKeys, idbGet, idbSet } from '../lib/idb';
import {
  clearGuestData,
  demoGuestData,
  guestAsUser,
  guestHasData,
  loadGuestData,
  saveGuestData,
  type GuestData,
  type GuestSettings,
} from '../lib/guestStore';
import {
  applyAccent,
  applyThemeMode,
  getStoredAccent,
  getStoredTheme,
  type Accent,
  type ThemeMode,
} from '../lib/theme';
import { changeLocale, detectLocale } from '../i18n';

type Status = 'loading' | 'signedOut' | 'guest' | 'ready';
type Role = 'user' | 'guest' | null;

export interface AuthApi {
  status: Status;
  role: Role;
  firebaseUser: User | null;
  user: WebUser | null;
  guestData: GuestData | null;
  error: string | null;
  configured: boolean;
  guestEnabled: boolean;
  signIn: () => Promise<void>;
  signInWithCredentials: (login: string, password: string) => Promise<void>;
  registerWithCredentials: (email: string, username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  startGuest: () => Promise<void>;
  exitGuest: () => Promise<void>;
  refresh: () => Promise<void>;
  applyUser: (user: WebUser) => void;
  patchUser: (patch: Record<string, unknown>) => Promise<WebUser | null>;
  updateGuestSettings: (patch: Partial<GuestSettings>) => Promise<void>;
  setGuestData: (data: GuestData) => Promise<void>;
  fillDemoData: () => Promise<void>;
  importGuest: () => Promise<{ chats: number; transactions: number } | null>;
  deleteAccount: () => Promise<void>;
  accent: Accent;
  setAccent: (accent: Accent) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<WebUser | null>(null);
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accent, setAccentState] = useState<Accent>(() => getStoredAccent());
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getStoredTheme());
  const [guestEnabled, setGuestEnabled] = useState(true);
  const bootstrapped = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const role: Role = status === 'guest' ? 'guest' : user ? 'user' : null;

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  useEffect(() => {
    applyThemeMode(themeMode);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (themeMode === 'system') applyThemeMode('system');
    };
    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, [themeMode]);

  const setAccent = useCallback((value: Accent) => setAccentState(value), []);
  const setThemeMode = useCallback((value: ThemeMode) => setThemeModeState(value), []);

  const applyUser = useCallback((next: WebUser) => {
    setUser(next);
    void changeLocale(next.locale);
    applyThemeMode(next.theme as ThemeMode);
    void idbSet(CacheKeys.user, next);
  }, []);

  const applyGuest = useCallback((data: GuestData) => {
    setGuestData(data);
    setUser(guestAsUser(data));
    void changeLocale(data.settings.locale);
  }, []);

  const updateGuestSettings = useCallback(
    async (patch: Partial<GuestSettings>) => {
      const current = guestData ?? (await loadGuestData(detectLocale()));
      const next: GuestData = { ...current, settings: { ...current.settings, ...patch } };
      const saved = await saveGuestData(next);
      applyGuest(saved);
    },
    [applyGuest, guestData],
  );

  const setGuestDataSafe = useCallback(
    async (data: GuestData) => {
      applyGuest(await saveGuestData(data));
    },
    [applyGuest],
  );

  const fillDemoData = useCallback(async () => {
    const locale = guestData?.settings.locale ?? detectLocale();
    const saved = await saveGuestData(demoGuestData(locale, guestData?.settings.currency));
    applyGuest(saved);
  }, [applyGuest, guestData?.settings.currency, guestData?.settings.locale]);

  const bootstrapSession = useCallback(async () => {
    try {
      const response = await apiFetch<{ user: WebUser }>('/api/session', { method: 'POST' });
      applyUser(response.user);
      setStatus('ready');
      setError(null);
    } catch (cause) {
      if (cause instanceof ApiError && (cause.code === 'offline' || cause.code === 'network')) {
        const cached = await idbGet<WebUser>(CacheKeys.user);
        if (cached) {
          setUser(cached);
          setStatus('ready');
          setError('offline');
          return;
        }
      }
      setError(cause instanceof Error ? cause.message : 'session_failed');
      setStatus('signedOut');
    }
  }, [applyUser]);

  const resumeGuest = useCallback(async () => {
    const token = await loadGuestToken();
    if (!token) return false;
    applyGuest(await loadGuestData(detectLocale()));
    setStatus('guest');
    return true;
  }, [applyGuest]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const session = loadSessionToken();
      if (session) {
        setStatus('loading');
        try {
          const response = await apiFetch<{ user: WebUser }>('/api/me');
          if (!active) return;
          applyUser(response.user);
          setStatus('ready');
          setError(null);
          return;
        } catch {
          clearSessionToken();
        }
      }

      const resumed = await resumeGuest();
      if (!active) return;
      if (!firebaseConfigured) {
        if (!resumed) setStatus('signedOut');
        return;
      }
      void completeRedirectSignIn();
      const unsubscribe = watchAuth((nextUser) => {
        if (!active) return;
        setFirebaseUser(nextUser);
        if (!nextUser) {
          if (!resumed) setStatus('signedOut');
          return;
        }
        if (bootstrapped.current) return;
        bootstrapped.current = true;
        setStatus('loading');
        void bootstrapSession();
      });
      cleanupRef.current = unsubscribe;
    })();

    return () => {
      active = false;
      cleanupRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithCredentials = useCallback(
    async (login: string, password: string) => {
      setError(null);
      setStatus('loading');
      try {
        const res = await apiLogin({ login, password });
        applyUser(res.user);
        setStatus('ready');
      } catch (cause) {
        setStatus('signedOut');
        const msg = cause instanceof Error ? cause.message : 'signin_failed';
        setError(msg);
        throw cause;
      }
    },
    [applyUser],
  );

  const registerWithCredentials = useCallback(
    async (email: string, username: string, password: string) => {
      setError(null);
      setStatus('loading');
      try {
        const res = await apiRegister({ email, username, password, locale: detectLocale() });
        applyUser(res.user);
        setStatus('ready');
      } catch (cause) {
        setStatus('signedOut');
        const msg = cause instanceof Error ? cause.message : 'register_failed';
        setError(msg);
        throw cause;
      }
    },
    [applyUser],
  );

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const signedIn = await signInWithGoogle();
      if (signedIn) {
        setFirebaseUser(signedIn);
        bootstrapped.current = true;
        setStatus('loading');
        await bootstrapSession();
      }
    } catch (cause) {
      const code = (cause as { code?: string })?.code ?? '';
      setError(code.includes('popup') ? 'popup_blocked' : 'signin_failed');
    }
  }, [bootstrapSession]);

  const startGuest = useCallback(async () => {
    setError(null);
    setStatus('loading');
    try {
      try {
        await startGuestSession();
      } catch {
        // Fallback to local guest mode
      }
      applyGuest(await loadGuestData(detectLocale()));
      setStatus('guest');
      setGuestEnabled(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'guest_failed');
      setStatus('signedOut');
    }
  }, [applyGuest]);

  const resetLocal = useCallback(async () => {
    await clearGuestData();
    setGuestToken(null);
    setGuestData(null);
    setUser(null);
  }, []);

  const signOut = useCallback(async () => {
    clearSessionToken();
    if (firebaseConfigured) await firebaseSignOut();
    await resetLocal();
    bootstrapped.current = false;
    setFirebaseUser(null);
    setStatus('signedOut');
  }, [resetLocal]);

  const exitGuest = useCallback(async () => {
    await resetLocal();
    setStatus('signedOut');
  }, [resetLocal]);

  const refresh = useCallback(async () => {
    try {
      const response = await apiFetch<{ user: WebUser }>('/api/me');
      applyUser(response.user);
    } catch {
      /* keep previous state */
    }
  }, [applyUser]);

  const patchUser = useCallback(
    async (patch: Record<string, unknown>) => {
      const response = await apiFetch<{ user: WebUser }>('/api/me', { method: 'PATCH', body: patch });
      applyUser(response.user);
      return response.user;
    },
    [applyUser],
  );

  const importGuest = useCallback(async () => {
    if (!guestData || !guestHasData(guestData)) return null;
    const payload = {
      chats: guestData.chats.map((chat) => ({
        kind: chat.kind,
        title: chat.title,
        preview: chat.preview,
        messages: chat.messages.map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        })),
      })),
      transactions: guestData.transactions.map((tx) => ({
        kind: tx.kind,
        amountMinor: tx.amountMinor,
        label: tx.label,
        category: tx.category,
        occurredAt: tx.occurredAt,
        hash: tx.hash ?? null,
      })),
      health: guestData.settings.health,
      finance: guestData.settings.finance,
      balanceMinor: guestData.settings.balanceMinor,
    };
    try {
      const response = await apiFetch<{ imported: { chats: number; transactions: number } }>('/api/guest/import', {
        method: 'POST',
        body: payload,
      });
      await clearGuestData();
      setGuestData(null);
      await refresh();
      return response.imported;
    } catch {
      return null;
    }
  }, [guestData, refresh]);

  const deleteAccount = useCallback(async () => {
    await apiFetch<{ deleted: boolean }>('/api/me', { method: 'DELETE', body: { confirm: 'DELETE' } });
    await firebaseSignOut();
    await resetLocal();
    setFirebaseUser(null);
    setStatus('signedOut');
  }, [resetLocal]);

  const value = useMemo<AuthApi>(
    () => ({
      status,
      role,
      firebaseUser,
      user,
      guestData,
      error,
      configured: firebaseConfigured,
      guestEnabled,
      signIn,
      signInWithCredentials,
      registerWithCredentials,
      signOut,
      startGuest,
      exitGuest,
      refresh,
      applyUser,
      patchUser,
      updateGuestSettings,
      setGuestData: setGuestDataSafe,
      fillDemoData,
      importGuest,
      deleteAccount,
      accent,
      setAccent,
      themeMode,
      setThemeMode,
    }),
    [
      status,
      role,
      firebaseUser,
      user,
      guestData,
      error,
      guestEnabled,
      signIn,
      signInWithCredentials,
      registerWithCredentials,
      signOut,
      startGuest,
      exitGuest,
      refresh,
      applyUser,
      patchUser,
      updateGuestSettings,
      setGuestDataSafe,
      fillDemoData,
      importGuest,
      deleteAccount,
      accent,
      setAccent,
      themeMode,
      setThemeMode,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
