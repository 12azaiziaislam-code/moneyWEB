/** /api/session, /api/me (+ export + real account deletion). */

import type { HealthProfile, FinanceProfile } from '../../../../shared/types';
import { deleteUserData, updateUser, type UserPatch } from '../db';
import { HttpError, jsonResponse, logAlert, nowISO, parseBearer } from '../http';
import type { RequestContext } from '../router';
import { deleteAccountSchema, mePatchSchema } from '../schemas';
import { purgeUserR2 } from '../storage';

export async function postSession(ctx: RequestContext): Promise<Response> {
  return jsonResponse({ user: ctx.user }, ctx.request, ctx.config);
}

export async function getMe(ctx: RequestContext): Promise<Response> {
  return jsonResponse({ user: ctx.user }, ctx.request, ctx.config);
}

export async function patchMe(ctx: RequestContext): Promise<Response> {
  const patch = await ctx.parseBody(mePatchSchema);
  const updates: UserPatch = {};
  const ts = nowISO();

  if (patch.locale !== undefined) updates.locale = patch.locale;
  if (patch.timezone !== undefined) updates.timezone = patch.timezone;
  if (patch.theme !== undefined) updates.theme = patch.theme;
  if (patch.madhhab !== undefined) updates.madhhab = patch.madhhab;
  if (patch.aiMode !== undefined) updates.aiMode = patch.aiMode;
  if (patch.displayName !== undefined) updates.displayName = patch.displayName;
  if (patch.balanceMinor !== undefined) updates.balanceMinor = patch.balanceMinor;
  if (patch.consent) updates.consentAt = ctx.user.consentAt ?? ts;

  if (patch.currency !== undefined) {
    updates.currency = patch.currency;
    // keep the finance document consistent with the account currency
    const finance: FinanceProfile = { ...ctx.user.finance, currency: patch.currency, updatedAt: ts };
    updates.finance = finance;
  }
  if (patch.finance !== undefined) {
    updates.finance = { ...patch.finance, updatedAt: ts } as FinanceProfile;
    updates.currency = patch.finance.currency;
  }
  if (patch.health !== undefined) {
    updates.health = { ...patch.health, updatedAt: ts } as HealthProfile;
  }

  if (patch.onboardingDone !== undefined) {
    const consentGiven = Boolean(ctx.user.consentAt || patch.consent);
    if (patch.onboardingDone && !consentGiven) {
      throw new HttpError(400, 'bad_request', 'Explicit consent is required before finishing onboarding.');
    }
    updates.onboardingDone = patch.onboardingDone;
  }

  const user = await updateUser(ctx.env.DB, ctx.auth.uid, updates);
  if (!user) throw new HttpError(404, 'not_found', 'Account not found.');
  return jsonResponse({ user }, ctx.request, ctx.config);
}

async function deleteFirebaseAccount(idToken: string, apiKey: string): Promise<boolean> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  );
  return response.ok;
}

export async function deleteMe(ctx: RequestContext): Promise<Response> {
  await ctx.parseBody(deleteAccountSchema);

  if (!ctx.config.firebaseApiKey) {
    logAlert('account_delete_unconfigured', {});
    throw new HttpError(
      503,
      'server_error',
      'Account deletion is not configured on this deployment (FIREBASE_API_KEY missing).',
    );
  }

  const idToken = parseBearer(ctx.request);
  if (!idToken) throw new HttpError(401, 'unauthorized', 'Authentication required.');

  let firebaseDeleted = false;
  try {
    firebaseDeleted = await deleteFirebaseAccount(idToken, ctx.config.firebaseApiKey);
  } catch {
    firebaseDeleted = false;
  }
  if (!firebaseDeleted) {
    logAlert('firebase_delete_failed', {});
    throw new HttpError(
      502,
      'server_error',
      'We could not delete your sign-in account. Please sign in again and retry.',
    );
  }

  // Firebase user is gone; now wipe every trace we own (R2 objects + D1 rows).
  await purgeUserR2(ctx.env, ctx.auth.uid);
  await deleteUserData(ctx.env.DB, ctx.auth.uid);
  return jsonResponse({ deleted: true }, ctx.request, ctx.config);
}

export async function exportMe(ctx: RequestContext): Promise<Response> {
  const db = ctx.env.DB;
  const uid = ctx.auth.uid;

  const [chats, messages, transactions, scans, confirmations] = await Promise.all([
    db.prepare('SELECT id, kind, title, preview, created_at, updated_at FROM chats WHERE uid = ?').bind(uid).all(),
    db
      .prepare('SELECT id, chat_id, role, content, created_at FROM messages WHERE uid = ? ORDER BY created_at ASC')
      .bind(uid)
      .all(),
    db
      .prepare(
        'SELECT id, kind, amount_minor, label, category, occurred_at, source FROM transactions WHERE uid = ? ORDER BY occurred_at DESC',
      )
      .bind(uid)
      .all(),
    db
      .prepare('SELECT id, verdict, confidence, product, created_at FROM halal_scans WHERE uid = ?')
      .bind(uid)
      .all(),
    db
      .prepare('SELECT source_id, payday_date, amount_minor, status FROM income_confirmations WHERE uid = ?')
      .bind(uid)
      .all(),
  ]);

  const payload = {
    exportedAt: nowISO(),
    app: 'Baraka',
    account: ctx.user,
    chats: chats.results ?? [],
    messages: messages.results ?? [],
    transactions: transactions.results ?? [],
    halalScans: scans.results ?? [],
    incomeConfirmations: confirmations.results ?? [],
    note: 'Images are not included in the export; they are deleted with the account.',
  };

  return jsonResponse(payload, ctx.request, ctx.config, 200, {
    'Content-Disposition': `attachment; filename="baraka-export-${new Date().toISOString().slice(0, 10)}.json"`,
    'Cache-Control': 'no-store',
  });
}
