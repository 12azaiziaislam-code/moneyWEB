/** POST /api/guest/start (public) + POST /api/guest/import (signed-in users only). */

import type { AppConfig } from '../env';
import { guestModeActive } from '../env';
import { hashIp, issueGuestToken } from '../guest';
import { HttpError, jsonResponse, logEvent, nowISO, randomId, readJson } from '../http';
import { consumeHourlyQuota } from '../rateLimit';
import type { RequestContext } from '../router';
import { guestImportSchema, guestStartSchema } from '../schemas';
import { getUser, updateUser } from '../db';

const TOKEN_TTL_SECONDS = 86_400;

interface TurnstileResponse {
  success?: boolean;
  'error-codes'?: string[];
}

async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }).toString(),
    });
    const data = (await response.json()) as TurnstileResponse;
    return data.success === true;
  } catch {
    return false;
  }
}

/** Public endpoint — issues an anonymous 24h guest token (rate limited per IP). */
export async function guestStart(request: Request, config: AppConfig, env: { DB: D1Database }): Promise<Response> {
  const cors = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

  if (!guestModeActive(config)) {
    return new Response(JSON.stringify({ error: { code: 'forbidden', message: 'Guest mode is disabled.' } }), {
      status: 403,
      headers: cors,
    });
  }

  let body: unknown = {};
  try {
    body = await readJson(request, 20_000);
  } catch {
    body = {};
  }
  const parsed = guestStartSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: { code: 'validation_failed', message: 'Invalid request.' } }), {
      status: 400,
      headers: cors,
    });
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  const ipHash = await hashIp(ip, config.guest.secret);

  if (config.guest.turnstileSecret) {
    const token = parsed.data.turnstileToken;
    if (!token || !(await verifyTurnstile(config.guest.turnstileSecret, token, ip))) {
      return new Response(
        JSON.stringify({ error: { code: 'forbidden', message: 'Human verification failed. Please retry.' } }),
        { status: 403, headers: cors },
      );
    }
  }

  const quota = await consumeHourlyQuota(env.DB, `ip_${ipHash}`, 'guest:tok', config.guest.tokensPerIpHour);
  if (!quota.allowed) {
    logEvent('guest_token_limited', { count: quota.count });
    return new Response(
      JSON.stringify({ error: { code: 'rate_limited', message: 'Too many guest sessions from this network.' } }),
      { status: 429, headers: { ...cors, 'Retry-After': String(quota.retryAfter) } },
    );
  }

  const guestId = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const { token } = await issueGuestToken(config.guest.secret, guestId, ipHash, TOKEN_TTL_SECONDS);
  logEvent('guest_started', {});

  return new Response(
    JSON.stringify({ token, guestId, expiresIn: TOKEN_TTL_SECONDS, limits: { perDay: config.guest.perDay } }),
    { status: 201, headers: cors },
  );
}


/** Signed-in users can carry their local guest data into the account once. */
export async function guestImport(ctx: RequestContext): Promise<Response> {
  if (ctx.auth.role !== 'user') {
    throw new HttpError(403, 'forbidden', 'Sign in with Google to keep your data.');
  }
  const input = await ctx.parseBody(guestImportSchema);
  const uid = ctx.auth.uid;
  const ts = nowISO();
  let chatsImported = 0;
  let messagesImported = 0;
  let transactionsImported = 0;

  for (const chat of input.chats) {
    if (!chat.messages.length) continue;
    const chatId = randomId('chat');
    const first = chat.messages[0];
    const createdAt = first?.createdAt && first.createdAt.length >= 10 ? first.createdAt : ts;
    await ctx.env.DB.prepare(
      `INSERT INTO chats (id, uid, kind, title, preview, image_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
    )
      .bind(chatId, uid, chat.kind, chat.title.slice(0, 80), (chat.preview ?? '').slice(0, 140), createdAt, ts)
      .run();
    chatsImported += 1;

    for (const message of chat.messages) {
      await ctx.env.DB.prepare(
        `INSERT INTO messages (id, chat_id, uid, role, content, image_id, meta_json, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
        .bind(
          randomId('msg'),
          chatId,
          uid,
          message.role,
          message.content.slice(0, 4000),
          JSON.stringify({ imported: true }),
          message.createdAt ?? ts,
        )
        .run();
      messagesImported += 1;
    }
  }

  for (const tx of input.transactions) {
    if (tx.hash) {
      const existing = await ctx.env.DB.prepare('SELECT id FROM transactions WHERE uid = ? AND hash = ?')
        .bind(uid, tx.hash)
        .first<{ id: string }>();
      if (existing) continue;
    }
    await ctx.env.DB.prepare(
      `INSERT INTO transactions (id, uid, kind, amount_minor, label, category, occurred_at, source, hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?)`,
    )
      .bind(
        randomId('tx'),
        uid,
        tx.kind,
        tx.amountMinor,
        tx.label.slice(0, 80),
        tx.category,
        tx.occurredAt,
        tx.hash ?? null,
        ts,
      )
      .run();
    transactionsImported += 1;
  }

  const current = await getUser(ctx.env.DB, uid);
  if (current && (input.health || input.finance || typeof input.balanceMinor === 'number')) {
    await updateUser(ctx.env.DB, uid, {
      health: input.health ? { ...input.health, updatedAt: ts } : undefined,
      finance: input.finance ? { ...input.finance, updatedAt: ts } : undefined,
      balanceMinor: input.balanceMinor,
    });
  }

  logEvent('guest_imported', { chats: chatsImported, transactions: transactionsImported });
  return jsonResponse(
    { imported: { chats: chatsImported, messages: messagesImported, transactions: transactionsImported } },
    ctx.request,
    ctx.config,
  );
}
