/** /api/ai/chat — the only door to the gateway. Verifies, limits, streams (SSE). */

import {
  GatewayError,
  MODELS,
  assertSafeBaseUrl,
  consumeCompletion,
  gatewayFetch,
  type GatewayMessage,
  type GatewayOptions,
} from '../ai/gateway';
import {
  accountantSystem,
  doctorSystem,
  financeSummary,
  isHealthProfileComplete,
  shaykhSystem,
} from '../ai/prompts';
import { assertGatewayConfigured } from '../env';
import { enforceAiQuota, resolveImage } from '../guestGuard';
import { HttpError, logEvent, nowISO, randomId, sseFrame, sseResponse } from '../http';
import { recordAiUsage } from '../rateLimit';
import { buildPlan } from '../planning';
import type { RequestContext } from '../router';
import { aiChatSchema, type AiChatInput } from '../schemas';
import type { ChatKind } from '../../../../shared/types';
import { DEFAULT_CURRENCY } from '../../../../shared/constants';
import { isEmergencyText } from '../../../../shared/health';

interface HistoryRow {
  role: string;
  content: string;
  image_id: string | null;
}

type GuestContext = AiChatInput['guest'];

async function ensureChat(ctx: RequestContext, input: AiChatInput): Promise<string> {
  if (input.chatId) {
    const existing = await ctx.env.DB.prepare('SELECT id, kind FROM chats WHERE id = ? AND uid = ?')
      .bind(input.chatId, ctx.auth.uid)
      .first<{ id: string; kind: string }>();
    if (!existing) throw new HttpError(404, 'not_found', 'Conversation not found.');
    if (existing.kind !== input.kind) throw new HttpError(400, 'bad_request', 'Conversation type mismatch.');
    return existing.id;
  }
  const id = randomId('chat');
  const ts = nowISO();
  const title = (input.text ?? '').trim().slice(0, 60) || (input.imageId ? 'Photo' : 'Chat');
  await ctx.env.DB.prepare(
    `INSERT INTO chats (id, uid, kind, title, preview, image_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', ?, ?, ?)`,
  )
    .bind(id, ctx.auth.uid, input.kind, title, input.imageId ?? null, ts, ts)
    .run();
  return id;
}

async function loadHistory(ctx: RequestContext, chatId: string): Promise<HistoryRow[]> {
  const { results } = await ctx.env.DB.prepare(
    `SELECT role, content, image_id FROM messages WHERE chat_id = ? AND uid = ?
     ORDER BY created_at DESC LIMIT 12`,
  )
    .bind(chatId, ctx.auth.uid)
    .all<HistoryRow>();
  return (results ?? []).reverse();
}

async function buildSystemPrompt(ctx: RequestContext, kind: ChatKind, guest?: GuestContext): Promise<string> {
  const { user, env } = ctx;
  const locale = guest?.locale ?? user.locale;
  const madhhab = guest?.madhhab ?? user.madhhab;

  if (kind === 'shaykh') return shaykhSystem(locale, madhhab);
  if (kind === 'doctor') return doctorSystem(locale, guest?.health ?? user.health);

  // Accountant: signed-in users get a live summary from D1; guests send theirs.
  if (guest) {
    return accountantSystem(locale, guest.finance ?? null, null, guest.planSummary ?? '', guest.finance?.currency ?? DEFAULT_CURRENCY);
  }

  const plan = await buildPlan(env, user);
  const { results } = await env.DB.prepare(
    `SELECT label, amount_minor, kind, category, occurred_at FROM transactions
     WHERE uid = ? ORDER BY occurred_at DESC LIMIT 12`,
  )
    .bind(user.uid)
    .all<{ label: string; amount_minor: number; kind: string; category: string; occurred_at: string }>();

  const summary = financeSummary({
    currency: user.currency,
    locale: user.locale,
    finance: user.finance,
    plan,
    transactions: (results ?? []).map((row) => ({
      label: row.label,
      amountMinor: row.amount_minor,
      kind: row.kind,
      category: row.category,
      occurredAt: row.occurred_at,
    })),
  });
  return accountantSystem(user.locale, user.finance, plan, summary, user.currency);
}

type UserPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

function buildGatewayMessages(
  system: string,
  history: HistoryRow[],
  userText: string,
  imageDataUrl: string | null,
  extraContext?: string,
): GatewayMessage[] {
  const messages: GatewayMessage[] = [{ role: 'system', content: system }];

  for (const row of history) {
    if (row.role !== 'user' && row.role !== 'assistant') continue;
    const text = row.content.slice(0, 2000);
    const prefix = row.image_id ? '[photo attached] ' : '';
    const content = `${prefix}${text}`.trim();
    if (content) messages.push({ role: row.role, content });
  }

  const parts: UserPart[] = [];
  if (imageDataUrl) parts.push({ type: 'image_url', image_url: { url: imageDataUrl } });
  const caption = [userText, extraContext ? `CONTEXT (validated data):\n${extraContext}` : '']
    .filter(Boolean)
    .join('\n\n');
  parts.push({ type: 'text', text: caption || 'Analyse the attached photo.' });
  messages.push({ role: 'user', content: parts });
  return messages;
}


function resolveTarget(
  ctx: RequestContext,
  input: AiChatInput,
  hasImage: boolean,
): { options: GatewayOptions; model: string } {
  const appVersion = ctx.config.appVersion;
  const isGuest = ctx.auth.role === 'guest';

  if (!isGuest && input.ownKey && ctx.user.aiMode === 'own') {
    return {
      options: {
        baseUrl: assertSafeBaseUrl(input.ownKey.baseUrl),
        apiKey: input.ownKey.apiKey,
        appVersion,
        timeoutMs: 120_000,
        maxAttempts: 2,
      },
      model: input.ownKey.model,
    };
  }

  assertGatewayConfigured(ctx.config);
  return {
    options: {
      baseUrl: ctx.config.gatewayBaseUrl,
      apiKey: ctx.config.gatewayKey,
      appVersion,
      timeoutMs: isGuest ? 60_000 : 120_000,
      maxAttempts: isGuest ? 3 : 4,
      fallbackModel: MODELS.fast,
      onRetry: (info) => logEvent('gateway_retry', { attempt: info.attempt, status: info.status }),
      onFallback: (info) => logEvent('gateway_fallback', { status: info.status }),
    },
    model: hasImage ? MODELS.vision : MODELS.fast,
  };
}

export async function streamChat(ctx: RequestContext): Promise<Response> {
  const input = await ctx.parseBody(aiChatSchema);
  const isGuest = ctx.auth.role === 'guest';
  const hasImage = Boolean(input.imageId || input.imageDataUrl);

  if (!input.text?.trim() && !hasImage) {
    throw new HttpError(400, 'bad_request', 'Please write something or attach a photo.');
  }
  if (input.kind === 'doctor') {
    const health = isGuest ? (input.guest?.health ?? null) : ctx.user.health;
    if (!isHealthProfileComplete(health)) {
      throw new HttpError(403, 'forbidden', 'Please complete your health profile first.', {
        reason: 'health_profile_incomplete',
      });
    }
  }

  await enforceAiQuota(ctx);

  const image = await resolveImage(ctx, input);
  const userText = (input.text ?? '').trim();
  const system = await buildSystemPrompt(ctx, input.kind, isGuest ? input.guest : undefined);
  const emergency = input.kind === 'doctor' && isEmergencyText(userText);
  const extra = [
    input.context,
    isGuest ? input.guest?.planSummary : '',
    emergency ? 'POSSIBLE EMERGENCY: tell the user to call 112 immediately.' : '',
  ]
    .filter(Boolean)
    .join('\n');

  // ---------------- guests: nothing is persisted server-side ----------------
  if (isGuest) {
    const history: HistoryRow[] = (input.guest?.history ?? []).map((row) => ({
      role: row.role,
      content: row.content,
      image_id: null,
    }));
    const messages = buildGatewayMessages(system, history, userText, image?.dataUrl ?? null, extra || undefined);
    const { options, model } = resolveTarget(ctx, input, hasImage);
    return pipeCompletion(ctx, { chatId: 'guest', options, model, messages, persist: false });
  }

  // ------------------------- signed-in users -------------------------------
  const chatId = await ensureChat(ctx, input);
  const history = await loadHistory(ctx, chatId);
  const ts = nowISO();

  await ctx.env.DB.prepare(
    `INSERT INTO messages (id, chat_id, uid, role, content, image_id, meta_json, created_at)
     VALUES (?, ?, ?, 'user', ?, ?, NULL, ?)`,
  )
    .bind(randomId('msg'), chatId, ctx.auth.uid, userText.slice(0, 4000), input.imageId ?? null, ts)
    .run();
  await ctx.env.DB.prepare(
    'UPDATE chats SET preview = ?, image_id = COALESCE(?, image_id), updated_at = ? WHERE id = ? AND uid = ?',
  )
    .bind((userText || 'photo').slice(0, 140), input.imageId ?? null, ts, chatId, ctx.auth.uid)
    .run();

  const messages = buildGatewayMessages(system, history, userText, image?.dataUrl ?? null, extra || undefined);
  const { options, model } = resolveTarget(ctx, input, hasImage);
  return pipeCompletion(ctx, { chatId, options, model, messages, persist: true });
}

interface StreamErrorPayload {
  code: string;
  message: string;
  status: number;
  retryAfter?: number;
}

export function describeStreamError(error: unknown): StreamErrorPayload {
  if (error instanceof GatewayError) {
    switch (error.kind) {
      case 'auth':
        return { code: 'ai_auth_failed', message: 'The assistant is temporarily unavailable.', status: 502 };
      case 'device':
        return {
          code: error.code === 'device_banned' ? 'device_banned' : 'device_pending',
          message: error.message,
          status: 403,
        };
      case 'rate_limit':
        return {
          code: 'rate_limited',
          message: 'The assistant is busy. Please retry in a moment.',
          status: 429,
          retryAfter: error.retryAfter || 20,
        };
      case 'timeout':
        return { code: 'ai_unavailable', message: 'The assistant took too long to answer.', status: 504 };
      default:
        return { code: 'ai_unavailable', message: 'The assistant is unavailable right now.', status: 503 };
    }
  }
  if (error instanceof HttpError) {
    return { code: error.code, message: error.message, status: error.status };
  }
  return { code: 'server_error', message: 'Something went wrong. Please retry.', status: 500 };
}

/**
 * Streams the completion to the browser as SSE. The response returns instantly;
 * the pump runs in waitUntil and keeps only the assistant text in memory.
 * `persist: false` (guests) performs zero database writes.
 */
function pipeCompletion(
  ctx: RequestContext,
  params: {
    chatId: string;
    options: GatewayOptions;
    model: string;
    messages: GatewayMessage[];
    persist: boolean;
  },
): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  let closed = false;

  const write = async (event: string, data: unknown): Promise<void> => {
    if (closed) return;
    try {
      await writer.write(encoder.encode(sseFrame(event, data)));
    } catch {
      closed = true;
    }
  };

  const task = (async () => {
    let usedModel = params.model;
    try {
      const result = await gatewayFetch(params.options, {
        model: params.model,
        messages: params.messages,
        stream: true,
        max_tokens: 800,
        temperature: 0.4,
      });
      usedModel = result.model;
      await write('start', { chatId: params.chatId, model: usedModel });
      const assistantText = await consumeCompletion(result.response, async (delta) => {
        await write('delta', { text: delta });
      });

      let messageId: string | null = null;
      const trimmed = assistantText.trim();
      if (params.persist && trimmed) {
        messageId = randomId('msg');
        const ts = nowISO();
        await ctx.env.DB.prepare(
          `INSERT INTO messages (id, chat_id, uid, role, content, image_id, meta_json, created_at)
           VALUES (?, ?, ?, 'assistant', ?, NULL, NULL, ?)`,
        )
          .bind(messageId, params.chatId, ctx.auth.uid, trimmed.slice(0, 20000), ts)
          .run();
        await ctx.env.DB.prepare('UPDATE chats SET preview = ?, updated_at = ? WHERE id = ? AND uid = ?')
          .bind(trimmed.slice(0, 140), ts, params.chatId, ctx.auth.uid)
          .run();
      }

      await recordAiUsage(ctx.env.DB, ctx.auth.uid, true, usedModel);
      await write('done', { chatId: params.chatId, messageId, model: usedModel });
    } catch (error) {
      await recordAiUsage(ctx.env.DB, ctx.auth.uid, false, usedModel);
      const payload = describeStreamError(error);
      logEvent('ai_stream_failed', { code: payload.code, status: payload.status });
      await write('error', payload);
    } finally {
      closed = true;
      try {
        await writer.close();
      } catch {
        /* already closed */
      }
    }
  })();

  ctx.waitUntil(task);
  return sseResponse(readable, ctx.request, ctx.config);
}
