/**
 * Tiny hand-rolled router. One Pages Function handles every /api route so the
 * bundle stays small and cold starts stay fast (free plan friendly).
 */

import type { ZodTypeAny, z } from 'zod';
import type { WebUser } from '../../../shared/types';
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from '../../../shared/constants';
import type { AuthUser } from './auth';
import { isGuest, requireAuth } from './auth';
import { DEFAULT_HEALTH, defaultFinance, ensureUser } from './db';
import { ConfigError, readConfig, type AppConfig, type Env } from './env';
import { HttpError, errorResponse, jsonResponse, logAlert, logEvent, noContent, nowISO, readJson } from './http';
import { AiParseError } from './ai/structured';
import { GatewayError } from './ai/gateway';
import { pruneRateLimits } from './rateLimit';

import * as meHandler from './handlers/me';
import * as chatsHandler from './handlers/chats';
import * as assetsHandler from './handlers/assets';
import * as aiHandler from './handlers/ai';
import * as analysisHandler from './handlers/analysis';
import * as financeHandler from './handlers/finance';
import * as guestHandler from './handlers/guest';
import * as authHandler from './handlers/auth';

export interface RequestContext {
  request: Request;
  env: Env;
  config: AppConfig;
  url: URL;
  auth: AuthUser;
  user: WebUser;
  waitUntil: (promise: Promise<unknown>) => void;
  params: Record<string, string>;
  parseBody: <S extends ZodTypeAny>(schema: S) => Promise<z.infer<S>>;
}

export type RouteHandler = (ctx: RequestContext) => Promise<Response>;

interface Route {
  method: string;
  pattern: string;
  handler: RouteHandler;
  /** who may call it: signed-in users only (default), guests only, or both */
  role?: 'user' | 'any';
}

const routes: Route[] = [
  { method: 'GET', pattern: '/api/health', handler: healthHandler, role: 'any' },
  { method: 'POST', pattern: '/api/guest/import', handler: guestHandler.guestImport },
  { method: 'POST', pattern: '/api/session', handler: meHandler.postSession },
  { method: 'GET', pattern: '/api/me', handler: meHandler.getMe },
  { method: 'PATCH', pattern: '/api/me', handler: meHandler.patchMe },
  { method: 'DELETE', pattern: '/api/me', handler: meHandler.deleteMe },
  { method: 'GET', pattern: '/api/me/export', handler: meHandler.exportMe },

  { method: 'POST', pattern: '/api/uploads', handler: assetsHandler.upload },
  { method: 'GET', pattern: '/api/assets/:id', handler: assetsHandler.getAsset },

  { method: 'GET', pattern: '/api/chats', handler: chatsHandler.listChats },
  { method: 'POST', pattern: '/api/chats', handler: chatsHandler.createChat },
  { method: 'GET', pattern: '/api/chats/:id', handler: chatsHandler.getChat },
  { method: 'PATCH', pattern: '/api/chats/:id', handler: chatsHandler.patchChat },
  { method: 'DELETE', pattern: '/api/chats/:id', handler: chatsHandler.deleteChat },

  { method: 'POST', pattern: '/api/ai/chat', handler: aiHandler.streamChat },

  { method: 'POST', pattern: '/api/halal/scan', handler: analysisHandler.halalScan },
  { method: 'POST', pattern: '/api/doctor/analyze', handler: analysisHandler.doctorAnalyze },
  { method: 'POST', pattern: '/api/accountant/extract', handler: analysisHandler.receiptExtract },
  { method: 'POST', pattern: '/api/accountant/balance', handler: analysisHandler.balanceExtract },

  { method: 'GET', pattern: '/api/finance', handler: financeHandler.getFinance },
  { method: 'PUT', pattern: '/api/finance', handler: financeHandler.putFinance },
  { method: 'GET', pattern: '/api/plan', handler: financeHandler.getPlan },
  { method: 'GET', pattern: '/api/transactions', handler: financeHandler.listTransactions },
  { method: 'POST', pattern: '/api/transactions', handler: financeHandler.createTransaction },
  { method: 'POST', pattern: '/api/transactions/bulk', handler: financeHandler.createTransactionsBulk },
  { method: 'PATCH', pattern: '/api/transactions/:id', handler: financeHandler.patchTransaction },
  { method: 'DELETE', pattern: '/api/transactions/:id', handler: financeHandler.deleteTransaction },
  { method: 'POST', pattern: '/api/balance', handler: financeHandler.setBalance },
  { method: 'GET', pattern: '/api/income/pending', handler: financeHandler.pendingIncomes },
  { method: 'POST', pattern: '/api/income/confirm', handler: financeHandler.confirmIncome },
];

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const expected = patternParts[i];
    const actual = pathParts[i];
    if (expected.startsWith(':')) {
      if (!actual) return null;
      params[expected.slice(1)] = decodeURIComponent(actual);
    } else if (expected !== actual) {
      return null;
    }
  }
  return params;
}

/** In-memory profile for guests — never persisted. */
function syntheticGuestUser(auth: AuthUser): WebUser {
  return {
    uid: auth.uid,
    email: null,
    displayName: null,
    locale: 'ar',
    timezone: DEFAULT_TIMEZONE,
    currency: DEFAULT_CURRENCY,
    theme: 'system',
    madhhab: 'none',
    aiMode: 'builtin',
    consentAt: null,
    onboardingDone: true,
    health: { ...DEFAULT_HEALTH },
    finance: defaultFinance(),
    balanceMinor: 0,
    createdAt: nowISO(),
  };
}

async function healthHandler(ctx: RequestContext): Promise<Response> {
  let dbOk = false;
  try {
    const row = await ctx.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
    dbOk = row?.ok === 1;
  } catch {
    dbOk = false;
  }
  return jsonResponse(
    { ok: dbOk, db: dbOk, version: ctx.config.appVersion, gateway: Boolean(ctx.config.gatewayKey) },
    ctx.request,
    ctx.config,
    dbOk ? 200 : 503,
  );
}


function mapError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;

  if (error instanceof GatewayError) {
    switch (error.kind) {
      case 'auth':
        logAlert('gateway_auth_failed', { status: error.status });
        return new HttpError(502, 'ai_auth_failed', 'The assistant is temporarily unavailable. Please try later.');
      case 'device':
        return new HttpError(403, error.code === 'device_banned' ? 'device_banned' : 'device_pending', error.message);
      case 'rate_limit':
        return new HttpError(
          429,
          'rate_limited',
          'The assistant is busy, please try again shortly.',
          undefined,
          error.retryAfter || 20,
        );
      case 'timeout':
        return new HttpError(504, 'ai_unavailable', 'The assistant took too long to answer. Please try again.');
      case 'network':
      case 'server':
        return new HttpError(503, 'ai_unavailable', 'The assistant is unavailable right now. Please retry.');
      default:
        return new HttpError(502, 'ai_unavailable', 'The assistant could not process this request.');
    }
  }

  if (error instanceof AiParseError) {
    return new HttpError(422, 'ai_parse_failed', 'We could not read that confidently. Please try a clearer photo.');
  }

  if (error instanceof ConfigError) {
    logAlert('config_error', {});
    return new HttpError(500, 'server_error', 'Server configuration error.');
  }

  return new HttpError(500, 'server_error', 'Something went wrong. Please retry.');
}

export async function handleApiRequest(
  request: Request,
  env: Env,
  pagesCtx: { waitUntil: (promise: Promise<unknown>) => void },
): Promise<Response> {
  const url = new URL(request.url);
  const config = readConfig(env);

  if (request.method === 'OPTIONS') return noContent(request, config);

  // Public liveness probe (no auth): used by uptime checks and the pre-launch list.
  if (request.method === 'GET' && url.pathname === '/api/health') {
    return healthHandler({ request, env, config } as RequestContext);
  }

  // Public guest token issuance (rate limited per IP inside the handler).
  if (request.method === 'POST' && url.pathname === '/api/guest/start') {
    return guestHandler.guestStart(request, config, env);
  }

  // Public credentials registration & login
  if (request.method === 'POST' && url.pathname === '/api/auth/register') {
    const parseBody = async <S extends ZodTypeAny>(schema: S) => {
      const json = await request.json().catch(() => ({}));
      return schema.parse(json);
    };
    return authHandler.authRegister({ request, env, config, parseBody } as RequestContext);
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const parseBody = async <S extends ZodTypeAny>(schema: S) => {
      const json = await request.json().catch(() => ({}));
      return schema.parse(json);
    };
    return authHandler.authLogin({ request, env, config, parseBody } as RequestContext);
  }

  const route = routes.find(
    (candidate) => candidate.method === request.method && matchPattern(candidate.pattern, url.pathname),
  );
  if (!route) {
    return errorResponse(new HttpError(404, 'not_found', 'Not found.'), request, config);
  }
  const params = matchPattern(route.pattern, url.pathname) ?? {};

  try {
    const auth = await requireAuth(request, config);
    const guest = isGuest(auth);
    if (guest && (route.role ?? 'user') === 'user') {
      throw new HttpError(403, 'forbidden', 'Sign in with Google to use this feature.');
    }
    // Guests are never written to D1: build an in-memory profile for the prompts.
    const user = guest ? syntheticGuestUser(auth) : await ensureUser(env.DB, auth);
    const ctx: RequestContext = {
      request,
      env,
      config,
      url,
      auth,
      user,
      waitUntil: pagesCtx.waitUntil,
      params,
      parseBody: async <S extends ZodTypeAny>(schema: S) => {
        const raw = await readJson(request, config.maxBodyBytes);
        const result = schema.safeParse(raw);
        if (!result.success) {
          throw new HttpError(
            400,
            'validation_failed',
            'Invalid request data.',
            result.error.issues
              .slice(0, 6)
              .map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
          );
        }
        return result.data;
      },
    };

    // Occasional housekeeping, never blocking the response.
    if (Math.random() < 0.02) pagesCtx.waitUntil(pruneRateLimits(env.DB));

    const response = await route.handler(ctx);
    logEvent('api_ok', { route: route.pattern, method: request.method, status: response.status });
    return response;
  } catch (error) {
    const httpError = mapError(error);
    if (httpError.status >= 500) {
      logAlert('api_error', { route: route.pattern, status: httpError.status, code: httpError.code });
    }
    return errorResponse(httpError, request, config);
  }
}
