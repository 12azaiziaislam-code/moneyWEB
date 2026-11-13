/**
 * Secure password hashing using Web Crypto PBKDF2 with SHA-256.
 * Zero external dependencies — runs in Cloudflare Workers and Node.
 */

const ITERATIONS = 100_000;
const encoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign'],
  );
  const exported = (await crypto.subtle.exportKey('raw', key)) as ArrayBuffer;
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  return `pbkdf2:${ITERATIONS}:${saltB64}:${hashB64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split(':');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const iterations = parseInt(parts[1], 10);
    const saltBinary = atob(parts[2]);
    const salt = new Uint8Array(saltBinary.length);
    for (let i = 0; i < saltBinary.length; i++) {
      salt[i] = saltBinary.charCodeAt(i);
    }
    const expectedHash = parts[3];

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey'],
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      true,
      ['sign'],
    );
    const exported = (await crypto.subtle.exportKey('raw', key)) as ArrayBuffer;
    const computedHash = btoa(String.fromCharCode(...new Uint8Array(exported)));
    return computedHash === expectedHash;
  } catch {
    return false;
  }
}
