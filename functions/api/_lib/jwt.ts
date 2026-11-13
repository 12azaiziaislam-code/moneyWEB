/**
 * Firebase ID token verification (RS256) with Web Crypto.
 * Pure and injectable so it can be unit tested without network access.
 */

export interface JwkKey extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

export interface JwkSet {
  keys: JwkKey[];
}

export interface FirebaseTokenPayload {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  auth_time?: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  user_id?: string;
  firebase?: { sign_in_provider?: string; identities?: Record<string, unknown> };
}

export type JwtErrorCode =
  | 'malformed'
  | 'unsupported_alg'
  | 'unknown_kid'
  | 'bad_signature'
  | 'expired'
  | 'issued_in_future'
  | 'wrong_issuer'
  | 'wrong_audience'
  | 'missing_subject';

export class JwtError extends Error {
  code: JwtErrorCode;
  constructor(code: JwtErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'JwtError';
    this.code = code;
  }
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decodes base64url (JWT segments) into bytes without relying on atob quirks. */
export function base64UrlDecode(input: string): Uint8Array {
  let str = String(input).replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  const pad = str.length % 4;
  if (pad === 2) str += '==';
  else if (pad === 3) str += '=';
  else if (pad === 1) throw new JwtError('malformed', 'Invalid base64url length');

  const output = new Uint8Array((str.length / 4) * 3 - (str.endsWith('==') ? 2 : str.endsWith('=') ? 1 : 0));
  let byteIndex = 0;
  for (let i = 0; i < str.length; i += 4) {
    const chunk = str.slice(i, i + 4);
    let bits = 0;
    for (let j = 0; j < 4; j += 1) {
      const char = chunk[j] ?? '=';
      const value = char === '=' ? 0 : B64_ALPHABET.indexOf(char);
      if (value < 0) throw new JwtError('malformed', 'Invalid base64url character');
      bits = (bits << 6) | value;
    }
    if (byteIndex < output.length) output[byteIndex++] = (bits >> 16) & 0xff;
    if (byteIndex < output.length) output[byteIndex++] = (bits >> 8) & 0xff;
    if (byteIndex < output.length) output[byteIndex++] = bits & 0xff;
  }
  return output;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeJsonSegment(segment: string): Record<string, unknown> {
  try {
    const json = new TextDecoder().decode(base64UrlDecode(segment));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new JwtError('malformed', 'Token segment is not valid JSON');
  }
}

export interface VerifyOptions {
  projectId: string;
  jwks: JwkSet;
  /** Injectable clock (unix seconds) for deterministic tests. */
  nowSeconds?: number;
  clockSkewSeconds?: number;
}

/**
 * Verifies signature + issuer + audience + expiry of a Firebase ID token.
 * Throws JwtError on any failure; never returns a partially valid payload.
 */
export async function verifyFirebaseToken(
  token: string,
  options: VerifyOptions,
): Promise<FirebaseTokenPayload> {
  if (!token || typeof token !== 'string') throw new JwtError('malformed', 'Missing token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new JwtError('malformed', 'JWT must have 3 segments');

  const header = decodeJsonSegment(parts[0]);
  if (header.alg !== 'RS256') throw new JwtError('unsupported_alg', 'Only RS256 is accepted');

  const kid = typeof header.kid === 'string' ? header.kid : undefined;
  const candidates = (options.jwks?.keys ?? []).filter(
    (key) => key && key.kty === 'RSA' && (!kid || key.kid === kid),
  );
  if (!candidates.length) throw new JwtError('unknown_kid', 'No matching JWK');

  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  let signature: Uint8Array;
  try {
    signature = base64UrlDecode(parts[2]);
  } catch {
    throw new JwtError('malformed', 'Invalid signature encoding');
  }

  let verified = false;
  for (const jwk of candidates) {
    try {
      const key = await crypto.subtle.importKey(
        'jwk',
        { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      verified = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        key,
        signature as unknown as BufferSource,
        signingInput,
      );
      if (verified) break;
    } catch {
      verified = false;
    }
  }
  if (!verified) throw new JwtError('bad_signature', 'Signature verification failed');

  const payload = decodeJsonSegment(parts[1]) as unknown as FirebaseTokenPayload;
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const skew = options.clockSkewSeconds ?? 60;

  const expectedIssuer = `https://securetoken.google.com/${options.projectId}`;
  if (payload.iss !== expectedIssuer) throw new JwtError('wrong_issuer', 'Unexpected issuer');
  if (payload.aud !== options.projectId) throw new JwtError('wrong_audience', 'Unexpected audience');
  if (typeof payload.exp !== 'number' || payload.exp + skew < now) throw new JwtError('expired', 'Token expired');
  if (typeof payload.iat === 'number' && payload.iat - skew > now) {
    throw new JwtError('issued_in_future', 'Token issued in the future');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length < 3) {
    throw new JwtError('missing_subject', 'Token has no subject');
  }
  return payload;
}
