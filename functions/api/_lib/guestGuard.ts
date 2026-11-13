/** Guest quotas + inline image validation shared by the AI endpoints. */

import { HttpError } from './http';
import { consumeAiRateLimit, consumeDailyQuota } from './rateLimit';
import type { RequestContext } from './router';
import { decodeDataUrl, sniffImageMime, toBase64 } from './storage';

/**
 * Guests get much tighter AI limits than signed-in users:
 * per guest token (hour/day) *and* per network (day).
 */
export async function enforceAiQuota(ctx: RequestContext): Promise<void> {
  const guest = ctx.auth.role === 'guest';

  const limits = guest
    ? { perHour: ctx.config.guest.perHour, perDay: ctx.config.guest.perDay }
    : { perHour: ctx.config.limitPerHour, perDay: ctx.config.limitPerDay };

  const result = await consumeAiRateLimit(ctx.env.DB, ctx.auth.uid, limits, 1);
  if (!result.allowed) {
    throw new HttpError(
      429,
      'rate_limited',
      guest
        ? 'Guest limit reached. Sign in with Google for a higher limit.'
        : 'You reached the assistant limit for now. Please try again later.',
      { role: ctx.auth.role, limitPerDay: limits.perDay },
      result.retryAfter,
    );
  }

  if (guest && ctx.auth.ipHash) {
    const ip = await consumeDailyQuota(ctx.env.DB, `ip_${ctx.auth.ipHash}`, 'guest:ai_ip', ctx.config.guest.ipPerDay);
    if (!ip.allowed) {
      throw new HttpError(
        429,
        'rate_limited',
        'Too many guest requests from this network today. Please sign in with Google.',
        { role: 'guest' },
        ip.retryAfter,
      );
    }
  }
}

/** Validates an inline base64 image from a guest and returns a clean data URL. */
export function normalizeInlineImage(dataUrl: string, maxBytes: number): string {
  const { mime, bytes } = decodeDataUrl(dataUrl);
  if (bytes.length > maxBytes) {
    throw new HttpError(413, 'payload_too_large', 'Image is too large. Please retake the photo.');
  }
  const sniffed = sniffImageMime(bytes);
  if (sniffed && sniffed !== mime) {
    throw new HttpError(400, 'bad_request', 'Image content does not match its type.');
  }
  return `data:${mime};base64,${toBase64(bytes)}`;
}

/** Users send an assetId, guests send the compressed image inline. */
export async function resolveImage(
  ctx: RequestContext,
  input: { assetId?: string; imageDataUrl?: string },
): Promise<{ dataUrl: string; mime: string } | null> {
  if (ctx.auth.role === 'guest') {
    if (!input.imageDataUrl) return null;
    const dataUrl = normalizeInlineImage(input.imageDataUrl, ctx.config.guest.maxImageBytes);
    return { dataUrl, mime: dataUrl.slice(5, dataUrl.indexOf(';')) };
  }
  if (input.assetId) {
    const { assetToDataUrl } = await import('./storage');
    return assetToDataUrl(ctx.env, ctx.auth.uid, input.assetId);
  }
  if (input.imageDataUrl) {
    const dataUrl = normalizeInlineImage(input.imageDataUrl, ctx.config.maxImageBytes);
    return { dataUrl, mime: dataUrl.slice(5, dataUrl.indexOf(';')) };
  }
  return null;
}

/** Model guard: guests never get the slow/deep models. */
export function guestModelAllowed(model: string): boolean {
  return !model.includes('31b');
}
