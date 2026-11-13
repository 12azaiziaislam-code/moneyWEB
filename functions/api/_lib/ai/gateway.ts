/**
 * Gemma Gateway client (OpenAI compatible) with retries, exponential backoff,
 * Retry-After support, timeouts and automatic fallback to the fast model.
 *
 * Model ids are CONSTANTS: the gateway silently falls back to a default model
 * when a name is unknown, so we never rely on errors to discover names.
 */

import { maskSecret } from '../redact';

export const MODELS = {
  /** default, ultra-fast, low-latency for chat */
  fast: 'gemini-2.5-flash-lite',
  /** fast vision (images, OCR of labels / receipts) */
  vision: 'gemini-2.5-flash-lite',
  /** balanced reasoning */
  balanced: 'gemini-2.5-flash',
  /** deep analysis — deep reasoning only */
  deep: 'gemma-4-31b-it',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
export const DEFAULT_MODEL: ModelId = MODELS.fast;

export type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export interface GatewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface GatewayRequestBody {
  model: string;
  messages: GatewayMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: 'json_object' };
}

export type GatewayFailureKind =
  | 'auth'
  | 'device'
  | 'rate_limit'
  | 'server'
  | 'timeout'
  | 'network'
  | 'bad_request';

export class GatewayError extends Error {
  kind: GatewayFailureKind;
  status: number;
  code?: string;
  retryable: boolean;
  retryAfter: number;

  constructor(
    kind: GatewayFailureKind,
    status: number,
    message: string,
    options: { code?: string; retryable?: boolean; retryAfter?: number } = {},
  ) {
    super(message);
    this.name = 'GatewayError';
    this.kind = kind;
    this.status = status;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter ?? 0;
  }
}

export interface GatewayOptions {
  baseUrl: string;
  apiKey: string;
  appVersion: string;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  /** Per-attempt timeout. 120s minimum for the slow deep model. */
  timeoutMs?: number;
  maxAttempts?: number;
  fallbackModel?: string;
  onRetry?: (info: { attempt: number; delayMs: number; status: number; model: string }) => void;
  onFallback?: (info: { from: string; to: string; status: number }) => void;
}

const retryStatuses = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return retryStatuses.has(status);
}

/** Deterministic-ish jitter without Math.random (keeps tests stable). */
export function backoffDelay(attempt: number, retryAfterSeconds = 0, jitterMs = 0): number {
  if (retryAfterSeconds > 0) return Math.min(retryAfterSeconds, 30) * 1000;
  const base = Math.min(8000, 500 * 2 ** attempt);
  return base + Math.min(500, jitterMs);
}

function parseRetryAfter(headers: Headers): number {
  const raw = headers.get('retry-after');
  if (!raw) return 0;
  const seconds = Number.parseFloat(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.max(0, (date - Date.now()) / 1000);
  return 0;
}

/** Blocks SSRF attempts when a user supplies their own base URL. */
export function assertSafeBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new GatewayError('bad_request', 400, 'Invalid base URL');
  }
  if (url.protocol !== 'https:') {
    throw new GatewayError('bad_request', 400, 'Base URL must use HTTPS');
  }
  const host = url.hostname.toLowerCase();
  const blocked =
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.startsWith('[');
  if (blocked) {
    throw new GatewayError('bad_request', 400, 'Base URL host is not allowed');
  }
  return url.toString().replace(/\/$/, '');
}

export function gatewayHeaders(apiKey: string, appVersion: string, stream: boolean): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    accept: stream ? 'text/event-stream' : 'application/json',
    // x-app-name contract: [A-Za-z0-9 .+/-], max 60 chars.
    'x-app-name': 'Baraka',
    'x-app-version': (appVersion || '1.0.0').replace(/[^\x20-\x7e]/g, '').slice(0, 30) || '1.0.0',
  };
}


async function singleAttempt(
  options: GatewayOptions,
  body: GatewayRequestBody,
  timeoutMs: number,
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = options.baseUrl.replace(/\/$/, '');
  const url = `${base}/chat/completions`;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: gatewayHeaders(options.apiKey, options.appVersion, body.stream !== false),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      throw await toGatewayError(response);
    }
    return response;
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof GatewayError) throw error;
    if (timedOut) {
      throw new GatewayError('timeout', 504, 'AI request timed out', { retryable: true });
    }
    throw new GatewayError('network', 0, maskSecret(error, [options.apiKey]), { retryable: true });
  }
}

async function toGatewayError(response: Response): Promise<GatewayError> {
  let code: string | undefined;
  let message = '';
  try {
    const raw = (await response.text()).slice(0, 2000);
    try {
      const parsed = JSON.parse(raw) as { error?: { code?: string; message?: string } };
      code = parsed?.error?.code;
      message = parsed?.error?.message ?? raw;
    } catch {
      message = raw;
    }
  } catch {
    message = '';
  }

  const safeMessage = maskSecret(message || `Gateway responded with ${response.status}`);
  const status = response.status;
  const retryAfter = parseRetryAfter(response.headers);

  if (status === 400) {
    return new GatewayError('bad_request', status, safeMessage, { code, retryable: false });
  }
  if (status === 401) {
    return new GatewayError('auth', status, 'Gateway credentials are invalid', { code, retryable: false });
  }
  if (status === 403 && (code === 'device_pending' || code === 'device_banned' || code === 'enroll_only_key')) {
    return new GatewayError('device', status, safeMessage, { code, retryable: false });
  }
  if (status === 429) {
    return new GatewayError('rate_limit', status, safeMessage, { code, retryable: true, retryAfter });
  }
  if (status >= 500) {
    return new GatewayError('server', status, safeMessage, { code, retryable: true, retryAfter });
  }
  return new GatewayError('bad_request', status, safeMessage, { code, retryable: isRetryableStatus(status) });
}

/**
 * POSTs a chat completion with retries and automatic fallback.
 * Throws GatewayError('auth') / GatewayError('device') immediately (no retry).
 */
export async function gatewayFetch(
  options: GatewayOptions,
  body: GatewayRequestBody,
): Promise<{ response: Response; model: string; attempts: number }> {
  if (!options.apiKey) {
    throw new GatewayError('auth', 401, 'Gateway key is not configured');
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleepImpl ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 4, 4));
  const timeoutMs = Math.max(30_000, options.timeoutMs ?? 120_000);
  const fallback = options.fallbackModel ?? MODELS.fast;

  let model = body.model || MODELS.fast;
  let lastError: GatewayError | null = null;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const response = await singleAttempt({ ...options, fetchImpl }, { ...body, model }, timeoutMs);
      const actualModel = response.headers.get('x-gateway-model') || model;
      return { response, model: actualModel, attempts: attempt };
    } catch (error) {
      const err =
        error instanceof GatewayError
          ? error
          : new GatewayError('network', 0, 'Network error', { retryable: true });
      lastError = err;

      if (err.kind === 'auth' || err.kind === 'device') throw err;
      if (!err.retryable) throw err;
      if (attempt >= maxAttempts) break;

      // Slower / specialised models degrade to the fast model after the first failure.
      if (model !== fallback) {
        options.onFallback?.({ from: model, to: fallback, status: err.status });
        model = fallback;
      }

      const delayMs = backoffDelay(attempt - 1, err.retryAfter, 120 * attempt);
      options.onRetry?.({ attempt, delayMs, status: err.status, model });
      await sleep(delayMs);
    }
  }

  throw lastError ?? new GatewayError('server', 500, 'AI request failed');
}


/** Extracts the text of a single completion / stream delta chunk. */
export function extractDelta(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const choices = (payload as { choices?: unknown[] }).choices;
  if (!Array.isArray(choices) || !choices.length) return '';
  const choice = choices[0] as {
    delta?: { content?: unknown };
    message?: { content?: unknown };
    text?: unknown;
  };
  const raw = choice.delta?.content ?? choice.message?.content ?? choice.text;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
          return (part as { text: string }).text;
        }
        return '';
      })
      .join('');
  }
  return '';
}

/**
 * Consumes a completion response (SSE stream or plain JSON) and accumulates the
 * assistant text. `onDelta` is invoked per chunk so the caller can pipe it out
 * immediately — nothing is buffered in memory except the final text.
 */
export async function consumeCompletion(
  response: Response,
  onDelta?: (text: string) => void | Promise<void>,
): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.body) return '';

  if (!contentType.includes('text/event-stream')) {
    const raw = await response.text();
    try {
      const text = extractDelta(JSON.parse(raw));
      if (text && onDelta) await onDelta(text);
      return text;
    } catch {
      return raw.slice(0, 8000);
    }
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let output = '';

  const handleFrame = async (frame: string): Promise<void> => {
    for (const line of frame.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const text = extractDelta(JSON.parse(payload));
        if (text) {
          output += text;
          if (onDelta) await onDelta(text);
        }
      } catch {
        /* keep-alive or partial frame — ignore */
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index = buffer.indexOf('\n\n');
    while (index >= 0) {
      const frame = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      await handleFrame(frame);
      index = buffer.indexOf('\n\n');
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) await handleFrame(buffer);
  return output;
}

/** One-shot convenience: sends a streamed request and returns the full text. */
export async function gatewayComplete(
  options: GatewayOptions,
  body: GatewayRequestBody,
  onDelta?: (text: string) => void | Promise<void>,
): Promise<{ text: string; model: string; attempts: number }> {
  const { response, model, attempts } = await gatewayFetch(options, { ...body, stream: true });
  const text = await consumeCompletion(response, onDelta);
  return { text, model, attempts };
}
