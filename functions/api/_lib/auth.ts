/**
 * Request authentication: verifies the Firebase ID token against Google's
 * securetoken JWKS, cached per isolate with the JWKS Cache-Control TTL.
 */

import type { AppConfig } from './env';
import { guestModeActive } from './env';
import { HttpError, parseBearer } from './http';
import { looksLikeGuestToken, verifyGuestToken } from './guest';
import { verifyUserToken } from './userToken';
import { JwtError, verifyFirebaseToken, type JwkSet } from './jwt';

export const GOOGLE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export interface AuthUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  role: 'user' | 'guest';
  guestId?: string;
  /** hashed IP for guest abuse limits (never the raw address) */
  ipHash?: string;
}

export function isGuest(auth: AuthUser): boolean {
  return auth.role === 'guest';
}

interface JwksCacheEntry {
  jwks: JwkSet;
  expiresAt: number;
}

// Module-level cache: survives for the lifetime of the isolate (no KV needed).
let jwksCache: JwksCacheEntry | null = null;

function ttlFromHeaders(headers: Headers, fallbackSeconds = 3600): number {
  const cacheControl = headers.get('cache-control') ?? '';
  const match = /max-age=(\d+)/i.exec(cacheControl);
  const ttl = match ? Number.parseInt(match[1], 10) : fallbackSeconds;
  return Math.max(300, Math.min(ttl, 24 * 3600));
}

export async function getGoogleJwks(
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<JwkSet> {
  if (jwksCache && jwksCache.expiresAt > now) return jwksCache.jwks;

  const response = await fetchImpl(GOOGLE_JWKS_URL, {
    headers: { accept: 'application/json' },
    // Google rotates keys rarely; the isolate cache above is the hot path.
    cf: { cacheTtl: 3600, cacheEverything: true },
  } as RequestInit);
  if (!response.ok) {
    throw new Error(`JWKS fetch failed (${response.status})`);
  }
  const jwks = (await response.json()) as JwkSet;
  if (!jwks || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
    throw new Error('JWKS payload is empty');
  }
  jwksCache = { jwks, expiresAt: now + ttlFromHeaders(response.headers) * 1000 };
  return jwks;
}

/** Test helper. */
export function resetJwksCache(): void {
  jwksCache = null;
}

export async function requireAuth(request: Request, config: AppConfig): Promise<AuthUser> {
  const token = parseBearer(request);
  if (!token) {
    throw new HttpError(401, 'unauthorized', 'Authentication required.');
  }

  // --- guest token (HS256, anonymous, 24h) -------------------------------
  if (looksLikeGuestToken(token)) {
    if (!guestModeActive(config)) {
      throw new HttpError(403, 'forbidden', 'Guest mode is disabled.');
    }
    try {
      const claims = await verifyGuestToken(token, config.guest.secret);
      return {
        uid: `guest:${claims.sub}`,
        email: null,
        name: null,
        picture: null,
        role: 'guest',
        guestId: claims.sub,
        ipHash: claims.iph,
      };
    } catch {
      throw new HttpError(401, 'invalid_token', 'Guest session expired. Please start guest mode again.');
    }
  }

  // --- Native User JWT token (HS256) -------------------------------------
  const userClaims = await verifyUserToken(token, config.jwtSecret);
  if (userClaims) {
    return {
      uid: userClaims.sub,
      email: userClaims.email,
      name: userClaims.name,
      picture: null,
      role: 'user',
    };
  }

  // --- Firebase ID token (RS256) -----------------------------------------
  if (!config.projectId) {
    throw new HttpError(401, 'invalid_token', 'Invalid or expired session.');
  }

  let jwks: JwkSet;
  try {
    jwks = await getGoogleJwks();
  } catch {
    throw new HttpError(503, 'server_error', 'Unable to verify your session right now. Please retry.');
  }

  try {
    const payload = await verifyFirebaseToken(token, { projectId: config.projectId, jwks });
    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      name: typeof payload.name === 'string' ? payload.name : null,
      picture: typeof payload.picture === 'string' ? payload.picture : null,
      role: 'user',
    };
  } catch (error) {
    // A rotated signing key shows up as unknown_kid: refresh the cache once.
    if (error instanceof JwtError && error.code === 'unknown_kid') {
      jwksCache = null;
      try {
        const refreshed = await getGoogleJwks();
        const payload = await verifyFirebaseToken(token, { projectId: config.projectId, jwks: refreshed });
        return {
          uid: payload.sub,
          email: typeof payload.email === 'string' ? payload.email : null,
          name: typeof payload.name === 'string' ? payload.name : null,
          picture: typeof payload.picture === 'string' ? payload.picture : null,
          role: 'user',
        };
      } catch {
        throw new HttpError(401, 'invalid_token', 'Your session has expired. Please sign in again.');
      }
    }
    throw new HttpError(401, 'invalid_token', 'Your session has expired. Please sign in again.');
  }
}
