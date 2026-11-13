/**
 * Local email & username password authentication handlers.
 * POST /api/auth/register
 * POST /api/auth/login
 */

import { mapUserRow, type UserRow } from '../db';
import { HttpError, jsonResponse, nowISO, randomId } from '../http';
import { hashPassword, verifyPassword } from '../password';
import type { RequestContext } from '../router';
import { authLoginSchema, authRegisterSchema } from '../schemas';
import { issueUserToken } from '../userToken';
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from '../../../../shared/constants';

export async function authRegister(ctx: RequestContext): Promise<Response> {
  const body = await ctx.parseBody(authRegisterSchema);
  const email = body.email.trim().toLowerCase();
  const username = body.username.trim().toLowerCase();
  const locale = body.locale ?? 'ar';

  // Check if email or username already taken
  const existing = await ctx.env.DB.prepare(
    'SELECT uid, email, username FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?',
  )
    .bind(email, username)
    .first<{ uid: string; email: string | null; username: string | null }>();

  if (existing) {
    if (existing.email && existing.email.toLowerCase() === email) {
      throw new HttpError(409, 'bad_request', 'هذا البريد الإلكتروني مسجل بالفعل');
    }
    throw new HttpError(409, 'bad_request', 'اسم المستخدم هذا مأخوذ بالفعل، يرجى اختيار اسم آخر');
  }

  const uid = randomId('usr');
  const passwordHash = await hashPassword(body.password);
  const ts = nowISO();

  await ctx.env.DB.prepare(
    `INSERT INTO users (
      uid, email, username, display_name, password_hash,
      locale, timezone, currency, theme, madhhab, ai_mode,
      consent_at, onboarding_done, health_json, finance_json, balance_minor,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, 'system', 'none', 'builtin',
      NULL, 0, '{}', '{}', 0,
      ?, ?
    )`,
  )
    .bind(
      uid,
      email,
      username,
      body.username.trim(), // display name
      passwordHash,
      locale,
      DEFAULT_TIMEZONE,
      DEFAULT_CURRENCY,
      ts,
      ts,
    )
    .run();

  const userRow = await ctx.env.DB.prepare('SELECT * FROM users WHERE uid = ?')
    .bind(uid)
    .first<UserRow>();

  if (!userRow) {
    throw new HttpError(500, 'server_error', 'Failed to create user record.');
  }

  const token = await issueUserToken(ctx.config.jwtSecret, {
    uid,
    email,
    name: body.username.trim(),
  });

  return jsonResponse({ token, user: mapUserRow(userRow) }, ctx.request, ctx.config, 201);
}

export async function authLogin(ctx: RequestContext): Promise<Response> {
  const body = await ctx.parseBody(authLoginSchema);
  const login = body.login.trim().toLowerCase();

  const userRow = await ctx.env.DB.prepare(
    'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?',
  )
    .bind(login, login)
    .first<UserRow & { password_hash?: string | null }>();

  if (!userRow || !userRow.password_hash) {
    throw new HttpError(401, 'unauthorized', 'اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const valid = await verifyPassword(body.password, userRow.password_hash);
  if (!valid) {
    throw new HttpError(401, 'unauthorized', 'اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const token = await issueUserToken(ctx.config.jwtSecret, {
    uid: userRow.uid,
    email: userRow.email,
    name: userRow.display_name,
  });

  return jsonResponse({ token, user: mapUserRow(userRow) }, ctx.request, ctx.config);
}
