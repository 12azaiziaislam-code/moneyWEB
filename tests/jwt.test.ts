import { beforeAll, describe, expect, it } from 'vitest';
import {
  JwtError,
  base64UrlDecode,
  base64UrlEncode,
  verifyFirebaseToken,
  type JwkSet,
} from '../functions/api/_lib/jwt';

const PROJECT_ID = 'baraka-test';
const KID = 'kid-1';

let privateKey: CryptoKey;
let jwks: JwkSet;

const encoder = new TextEncoder();
const NOW = 1_800_000_000; // fixed clock for deterministic tests

function encodeJson(value: unknown): string {
  return base64UrlEncode(encoder.encode(JSON.stringify(value)));
}

async function signToken(
  payload: Record<string, unknown>,
  header: Record<string, unknown> = { alg: 'RS256', typ: 'JWT', kid: KID },
): Promise<string> {
  const head = encodeJson(header);
  const body = encodeJson(payload);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, encoder.encode(`${head}.${body}`));
  return `${head}.${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sub: 'user-123',
    aud: PROJECT_ID,
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    iat: NOW - 60,
    exp: NOW + 3600,
    email: 'user@example.com',
    email_verified: true,
    ...overrides,
  };
}

beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  privateKey = pair.privateKey;
  const jwk = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey;
  jwks = { keys: [{ ...jwk, kid: KID, alg: 'RS256' }] };
});

describe('jwt: base64url helpers', () => {
  it('round-trips binary data', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 255]);
    expect(Array.from(base64UrlDecode(base64UrlEncode(bytes)))).toEqual(Array.from(bytes));
  });
});

describe('jwt: Firebase ID token verification', () => {
  it('accepts a correctly signed token', async () => {
    const token = await signToken(validPayload());
    const payload = await verifyFirebaseToken(token, { projectId: PROJECT_ID, jwks, nowSeconds: NOW });
    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('user@example.com');
  });

  it('rejects an expired token', async () => {
    const token = await signToken(validPayload({ exp: NOW - 120, iat: NOW - 3600 }));
    await expect(verifyFirebaseToken(token, { projectId: PROJECT_ID, jwks, nowSeconds: NOW })).rejects.toMatchObject({
      code: 'expired',
    });
  });

  it('rejects a token for another audience', async () => {
    const token = await signToken(validPayload({ aud: 'other-project' }));
    await expect(verifyFirebaseToken(token, { projectId: PROJECT_ID, jwks, nowSeconds: NOW })).rejects.toBeInstanceOf(
      JwtError,
    );
  });

  it('rejects a token from another issuer', async () => {
    const token = await signToken(validPayload({ iss: 'https://securetoken.google.com/other' }));
    await expect(verifyFirebaseToken(token, { projectId: PROJECT_ID, jwks, nowSeconds: NOW })).rejects.toMatchObject({
      code: 'wrong_issuer',
    });
  });

  it('rejects a tampered payload', async () => {
    const token = await signToken(validPayload());
    const [head, , signature] = token.split('.');
    const forged = `${head}.${encodeJson(validPayload({ sub: 'attacker' }))}.${signature}`;
    await expect(verifyFirebaseToken(forged, { projectId: PROJECT_ID, jwks, nowSeconds: NOW })).rejects.toMatchObject({
      code: 'bad_signature',
    });
  });

  it('rejects an unknown key id', async () => {
    const token = await signToken(validPayload(), { alg: 'RS256', kid: 'other-kid' });
    await expect(verifyFirebaseToken(token, { projectId: PROJECT_ID, jwks, nowSeconds: NOW })).rejects.toMatchObject({
      code: 'unknown_kid',
    });
  });

  it('rejects non-RS256 algorithms (alg confusion)', async () => {
    const token = await signToken(validPayload(), { alg: 'HS256', kid: KID });
    await expect(verifyFirebaseToken(token, { projectId: PROJECT_ID, jwks, nowSeconds: NOW })).rejects.toMatchObject({
      code: 'unsupported_alg',
    });
  });

  it('rejects a token without a subject', async () => {
    const token = await signToken(validPayload({ sub: '' }));
    await expect(verifyFirebaseToken(token, { projectId: PROJECT_ID, jwks, nowSeconds: NOW })).rejects.toMatchObject({
      code: 'missing_subject',
    });
  });

  it('rejects a malformed token', async () => {
    await expect(verifyFirebaseToken('not-a-jwt', { projectId: PROJECT_ID, jwks, nowSeconds: NOW })).rejects.toMatchObject({
      code: 'malformed',
    });
  });
});
