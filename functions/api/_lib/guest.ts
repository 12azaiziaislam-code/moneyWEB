/**
 * Guest tokens: short-lived HS256 JWTs signed with GUEST_JWT_SECRET.
 * They only carry an anonymous guest id — no personal data — and are never
 * stored server-side. All user content for guests stays in the browser.
 */

export interface GuestClaims {
  sub: string;
  role: 'guest';
  /** hashed IP, used only for abuse limits */
  iph: string;
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): Uint8Array {
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function segment(value: unknown): string {
  return base64UrlEncode(encoder.encode(JSON.stringify(value)));
}

export async function hashIp(ip: string, secret: string): Promise<string> {
  const key = await hmacKey(`ip:${secret}`);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(ip || 'unknown'));
  return base64UrlEncode(new Uint8Array(digest)).slice(0, 22);
}

export async function issueGuestToken(
  secret: string,
  guestId: string,
  ipHash: string,
  ttlSeconds = 86_400,
): Promise<{ token: string; claims: GuestClaims }> {
  const now = Math.floor(Date.now() / 1000);
  const claims: GuestClaims = { sub: guestId, role: 'guest', iph: ipHash, iat: now, exp: now + ttlSeconds };
  const head = segment({ alg: 'HS256', typ: 'JWT' });
  const body = segment(claims);
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${head}.${body}`));
  return { token: `${head}.${body}.${base64UrlEncode(new Uint8Array(signature))}`, claims };
}

export class GuestTokenError extends Error {
  code: 'malformed' | 'bad_signature' | 'expired';
  constructor(code: GuestTokenError['code']) {
    super(code);
    this.name = 'GuestTokenError';
    this.code = code;
  }
}

export async function verifyGuestToken(token: string, secret: string): Promise<GuestClaims> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new GuestTokenError('malformed');
  let header: { alg?: string };
  try {
    header = JSON.parse(decoder.decode(base64UrlDecode(parts[0]))) as { alg?: string };
  } catch {
    throw new GuestTokenError('malformed');
  }
  if (header.alg !== 'HS256') throw new GuestTokenError('malformed');

  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecode(parts[2]) as unknown as BufferSource,
    encoder.encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw new GuestTokenError('bad_signature');

  let claims: GuestClaims;
  try {
    claims = JSON.parse(decoder.decode(base64UrlDecode(parts[1]))) as GuestClaims;
  } catch {
    throw new GuestTokenError('malformed');
  }
  if (claims.role !== 'guest' || typeof claims.sub !== 'string' || claims.sub.length < 8) {
    throw new GuestTokenError('malformed');
  }
  if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) {
    throw new GuestTokenError('expired');
  }
  return claims;
}

/** Recognises our guest tokens without touching the signature (cheap check). */
export function looksLikeGuestToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const header = JSON.parse(decoder.decode(base64UrlDecode(parts[0]))) as { alg?: string };
    if (header.alg !== 'HS256') return false;
    const body = JSON.parse(decoder.decode(base64UrlDecode(parts[1]))) as { role?: string };
    return body.role === 'guest';
  } catch {
    return false;
  }
}
