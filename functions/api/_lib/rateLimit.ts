/**
 * Durable, per-key rate limiting on D1 — works on the free plan without extra
 * bindings and survives cold starts. Windows are aligned to UTC hour/day.
 *
 * Keys are opaque: `uid` for signed-in users, `guest:<id>` and `ip_<hash>` for
 * guests. Only counters are stored — never raw IPs, never content.
 */

import { nowISO } from './http';

export interface RateLimits {
  perHour: number;
  perDay: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  hourCount: number;
  dayCount: number;
  remainingHour: number;
  remainingDay: number;
}

export interface WindowResult {
  allowed: boolean;
  count: number;
  retryAfter: number;
}

async function bump(db: D1Database, key: string, bucket: string, windowStart: number, cost: number): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (uid, bucket, window_start, count) VALUES (?, ?, ?, ?)
       ON CONFLICT(uid, bucket, window_start) DO UPDATE SET count = count + excluded.count
       RETURNING count`,
    )
    .bind(key, bucket, windowStart, cost)
    .first<{ count: number }>();
  return Number(row?.count ?? cost);
}

/** Hourly + daily counters for AI usage. */
export async function consumeAiRateLimit(
  db: D1Database,
  key: string,
  limits: RateLimits,
  cost = 1,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const hourStart = now - (now % 3600);
  const dayStart = now - (now % 86_400);

  const hourCount = await bump(db, key, 'ai:h', hourStart, cost);
  const dayCount = await bump(db, key, 'ai:d', dayStart, cost);

  const hourOver = hourCount > limits.perHour;
  const dayOver = dayCount > limits.perDay;
  const retryAfter = hourOver
    ? Math.max(1, 3600 - (now - hourStart))
    : dayOver
      ? Math.max(1, 86_400 - (now - dayStart))
      : 0;

  return {
    allowed: !hourOver && !dayOver,
    retryAfter,
    hourCount,
    dayCount,
    remainingHour: Math.max(0, limits.perHour - hourCount),
    remainingDay: Math.max(0, limits.perDay - dayCount),
  };
}

/** Single daily counter (guest IP quota). */
export async function consumeDailyQuota(
  db: D1Database,
  key: string,
  bucket: string,
  limit: number,
): Promise<WindowResult> {
  const now = Math.floor(Date.now() / 1000);
  const dayStart = now - (now % 86_400);
  const count = await bump(db, key, bucket, dayStart, 1);
  return {
    allowed: count <= limit,
    count,
    retryAfter: count > limit ? Math.max(1, 86_400 - (now - dayStart)) : 0,
  };
}

/** Single hourly counter (guest token issuance per IP). */
export async function consumeHourlyQuota(
  db: D1Database,
  key: string,
  bucket: string,
  limit: number,
): Promise<WindowResult> {
  const now = Math.floor(Date.now() / 1000);
  const hourStart = now - (now % 3600);
  const count = await bump(db, key, bucket, hourStart, 1);
  return {
    allowed: count <= limit,
    count,
    retryAfter: count > limit ? Math.max(1, 3600 - (now - hourStart)) : 0,
  };
}

/** Cheap, privacy-preserving counters (no content, no prompts). */
export async function recordAiUsage(db: D1Database, key: string, ok: boolean, model: string): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  try {
    await db
      .prepare(
        `INSERT INTO ai_usage (uid, day, requests, failures, last_model, updated_at) VALUES (?, ?, 1, ?, ?, ?)
         ON CONFLICT(uid, day) DO UPDATE SET
           requests = requests + 1,
           failures = failures + excluded.failures,
           last_model = excluded.last_model,
           updated_at = excluded.updated_at`,
      )
      .bind(key, day, ok ? 0 : 1, model, nowISO())
      .run();
  } catch {
    /* metrics must never break a user request */
  }
}

/** Deletes windows older than 3 days (called rarely from the router). */
export async function pruneRateLimits(db: D1Database): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - 3 * 86_400;
  try {
    await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(cutoff).run();
  } catch {
    /* best effort */
  }
}
