/**
 * User JWT tokens: HS256 JWTs signed with server secret.
 * Used for direct email/username & password authentication.
 */

export interface UserClaims {
  sub: string;
  role: 'user';
  email: string | null;
  name: string | null;
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

export async function issueUserToken(
  secret: string,
  user: { uid: string; email?: string | null; name?: string | null },
  ttlSeconds = 30 * 86_400, // 30 days
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: UserClaims = {
    sub: user.uid,
    role: 'user',
    email: user.email ?? null,
    name: user.name ?? null,
    iat: now,
    exp: now + ttlSeconds,
  };
  const head = segment({ alg: 'HS256', typ: 'JWT' });
  const body = segment(claims);
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${head}.${body}`));
  return `${head}.${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyUserToken(token: string, secret: string): Promise<UserClaims | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(decoder.decode(base64UrlDecode(parts[0]))) as { alg?: string };
    if (header.alg !== 'HS256') return null;

    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(parts[2]) as unknown as BufferSource,
      encoder.encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;

    const claims = JSON.parse(decoder.decode(base64UrlDecode(parts[1]))) as UserClaims;
    if (claims.role !== 'user' || !claims.sub) return null;
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) return null;

    return claims;
  } catch {
    return null;
  }
}

