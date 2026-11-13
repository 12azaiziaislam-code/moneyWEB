/**
 * HTTP plumbing: CORS allow-list, security headers, typed errors, SSE helpers,
 * secret masking. Nothing in here ever logs health / finance / image content.
 */

import type { ApiErrorCode } from '../../../shared/types';
import type { AppConfig } from './env';

const JSON_TYPE = 'application/json; charset=utf-8';

export class HttpError extends Error {
  status: number;
  code: ApiErrorCode;
  details?: unknown;
  retryAfter?: number;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown, retryAfter?: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=()',
};

function originOf(request: Request): string {
  return (request.headers.get('Origin') ?? '').replace(/\/$/, '');
}

function isAllowedOrigin(origin: string, request: Request, config: AppConfig): boolean {
  if (!origin) return false;
  try {
    const self = new URL(request.url).origin;
    if (origin === self) return true;
  } catch {
    /* ignore */
  }
  return config.allowedOrigins.includes(origin);
}

export function corsHeaders(request: Request, config: AppConfig): Record<string, string> {
  const origin = originOf(request);
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
  if (isAllowedOrigin(origin, request, config)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function buildHeaders(
  request: Request,
  config: AppConfig,
  extra: Record<string, string> = {},
): Headers {
  return new Headers({ ...SECURITY_HEADERS, ...corsHeaders(request, config), ...extra });
}

export function jsonResponse(
  data: unknown,
  request: Request,
  config: AppConfig,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  const headers = buildHeaders(request, config, { 'Content-Type': JSON_TYPE, ...extra });
  return new Response(JSON.stringify(data), { status, headers });
}

export function errorResponse(error: HttpError, request: Request, config: AppConfig): Response {
  const headers = buildHeaders(request, config, { 'Content-Type': JSON_TYPE });
  if (error.retryAfter) headers.set('Retry-After', String(Math.ceil(error.retryAfter)));
  return new Response(
    JSON.stringify({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
        ...(error.retryAfter ? { retryAfter: Math.ceil(error.retryAfter) } : {}),
      },
    }),
    { status: error.status, headers },
  );
}

export function noContent(request: Request, config: AppConfig): Response {
  return new Response(null, { status: 204, headers: buildHeaders(request, config) });
}

export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes: number): Promise<T> {
  const declared = Number.parseInt(request.headers.get('content-length') ?? '0', 10);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new HttpError(413, 'payload_too_large', 'Request body is too large.');
  }
  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new HttpError(413, 'payload_too_large', 'Request body is too large.');
  }
  if (!raw.trim()) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(400, 'bad_request', 'Invalid JSON body.');
  }
}

export function parseBearer(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}


/** SSE frame. `data` is JSON encoded so newlines can never break the protocol. */
export function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function sseResponse(stream: ReadableStream<Uint8Array>, request: Request, config: AppConfig): Response {
  const headers = buildHeaders(request, config, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  return new Response(stream, { status: 200, headers });
}

/** Redacts secrets and bearer tokens from anything that might be logged/shown. */
export { maskSecret } from './redact';

/** Structured log without PII. Never pass message text / images / amounts. */
export function logEvent(event: string, data: Record<string, unknown> = {}): void {
  try {
    console.log(JSON.stringify({ event, ...data, ts: new Date().toISOString() }));
  } catch {
    console.log(event);
  }
}

export function logAlert(event: string, data: Record<string, unknown> = {}): void {
  try {
    console.error(JSON.stringify({ alert: event, ...data, ts: new Date().toISOString() }));
  } catch {
    console.error(event);
  }
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 22)}`;
}
