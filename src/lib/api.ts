/**
 * Typed API client. Works for both signed-in users (Firebase ID token) and
 * guests (anonymous HS256 token issued by /api/guest/start).
 * AI never goes straight to the gateway: everything passes through our worker.
 */

import type { ApiErrorBody, ApiErrorCode, WebUser } from '../../shared/types';
import { getIdToken } from './firebase';
import { CacheKeys, idbDel, idbGet, idbSet } from './idb';

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  retryAfter: number;
  details?: unknown;

  constructor(code: ApiErrorCode, status: number, message: string, details?: unknown, retryAfter = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

/* ------------------------------ session token ----------------------------- */

let sessionToken: string | null = null;
const SESSION_TOKEN_KEY = 'baraka_user_token_v1';

export function setSessionToken(token: string | null): void {
  sessionToken = token;
  try {
    if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
    else localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    /* private browsing */
  }
}

export function loadSessionToken(): string | null {
  if (sessionToken) return sessionToken;
  try {
    sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    sessionToken = null;
  }
  return sessionToken;
}

export function clearSessionToken(): void {
  setSessionToken(null);
}

export async function apiRegister(body: {
  email: string;
  username: string;
  password: string;
  locale?: string;
}): Promise<{ token: string; user: WebUser }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { token: string; user: WebUser };
  setSessionToken(data.token);
  return data;
}

export async function apiLogin(body: { login: string; password: string }): Promise<{ token: string; user: WebUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { token: string; user: WebUser };
  setSessionToken(data.token);
  return data;
}

/* ------------------------------- guest token ------------------------------ */

let guestToken: string | null = null;

export function setGuestToken(token: string | null): void {
  guestToken = token;
  if (token) void idbSet(CacheKeys.guestToken, { token, savedAt: Date.now() });
  else void idbDel(CacheKeys.guestToken);
}

export async function loadGuestToken(): Promise<string | null> {
  if (guestToken) return guestToken;
  const stored = await idbGet<{ token: string; savedAt: number }>(CacheKeys.guestToken);
  if (!stored?.token) return null;
  // Guest tokens live 24h — drop stale ones early so the UI can restart cleanly.
  if (Date.now() - stored.savedAt > 23 * 3600 * 1000) {
    await idbDel(CacheKeys.guestToken);
    return null;
  }
  guestToken = stored.token;
  return guestToken;
}

export function hasGuestToken(): boolean {
  return Boolean(guestToken);
}

async function authToken(): Promise<string | null> {
  const session = loadSessionToken();
  if (session) return session;
  const firebase = await getIdToken(false);
  if (firebase) return firebase;
  return loadGuestToken();
}

/* --------------------------------- fetch ---------------------------------- */

async function parseError(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> | null = null;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = null;
  }
  const code = (body?.error?.code ?? (response.status === 401 ? 'unauthorized' : 'server_error')) as ApiErrorCode;
  return new ApiError(
    code,
    response.status,
    body?.error?.message ?? `Request failed (${response.status})`,
    body?.error?.details,
    body?.error?.retryAfter ?? 0,
  );
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError('offline', 0, 'You are offline');
  }
  const token = await authToken();
  if (!token) throw new ApiError('unauthorized', 401, 'Not signed in');

  const send = (bearer: string): Promise<Response> =>
    fetch(path, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${bearer}`,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Accept: 'application/json',
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      credentials: 'omit',
    });

  let response: Response;
  try {
    response = await send(token);
    if (response.status === 401) {
      const refreshed = (await getIdToken(true)) ?? (await loadGuestToken());
      if (refreshed && refreshed !== token) response = await send(refreshed);
    }
  } catch {
    throw new ApiError('network', 0, 'Network error');
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('server_error', response.status, 'Malformed server response');
  }
}

export function assetUrl(id: string | null | undefined): string | null {
  return id ? `/api/assets/${encodeURIComponent(id)}` : null;
}

/* ---------------------------- guest session API --------------------------- */

export interface GuestSession {
  token: string;
  guestId: string;
  expiresIn: number;
  limits: { perDay: number };
}

export async function startGuestSession(turnstileToken?: string): Promise<GuestSession> {
  let response: Response;
  try {
    response = await fetch('/api/guest/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(turnstileToken ? { turnstileToken } : {}),
    });
  } catch {
    throw new ApiError('network', 0, 'Network error');
  }
  if (!response.ok) throw await parseError(response);
  const session = (await response.json()) as GuestSession;
  setGuestToken(session.token);
  return session;
}

/* ---------------------------------- SSE ----------------------------------- */

export interface StreamHandlers {
  onStart?: (info: { chatId: string; model: string }) => void;
  onDelta?: (text: string) => void;
  onDone?: (info: { chatId: string; messageId: string | null; model: string }) => void;
  onError?: (error: ApiError) => void;
}

export async function streamAiChat(body: unknown, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
  const token = await authToken();
  if (!token) throw new ApiError('unauthorized', 401, 'Not signed in');

  let response: Response;
  try {
    response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw new ApiError('network', 0, 'aborted');
    throw new ApiError('network', 0, 'Network error');
  }

  if (!response.ok) {
    const error = await parseError(response);
    handlers.onError?.(error);
    throw error;
  }
  if (!response.body) throw new ApiError('server_error', 502, 'Empty stream');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleFrame = (frame: string): void => {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) return;
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
    } catch {
      return;
    }
    if (event === 'start') {
      handlers.onStart?.({ chatId: String(payload.chatId ?? ''), model: String(payload.model ?? '') });
    } else if (event === 'delta') {
      handlers.onDelta?.(String(payload.text ?? ''));
    } else if (event === 'done') {
      handlers.onDone?.({
        chatId: String(payload.chatId ?? ''),
        messageId: payload.messageId ? String(payload.messageId) : null,
        model: String(payload.model ?? ''),
      });
    } else if (event === 'error') {
      handlers.onError?.(
        new ApiError(
          (payload.code as ApiErrorCode) ?? 'ai_unavailable',
          Number(payload.status ?? 500),
          String(payload.message ?? 'AI error'),
          undefined,
          Number(payload.retryAfter ?? 0),
        ),
      );
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index = buffer.indexOf('\n\n');
    while (index >= 0) {
      handleFrame(buffer.slice(0, index));
      buffer = buffer.slice(index + 2);
      index = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) handleFrame(buffer);
}
