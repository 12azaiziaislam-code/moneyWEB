import { describe, expect, it } from 'vitest';
import {
  GuestTokenError,
  hashIp,
  issueGuestToken,
  looksLikeGuestToken,
  verifyGuestToken,
} from '../functions/api/_lib/guest';

const SECRET = 'x'.repeat(48);

describe('guest tokens', () => {
  it('round-trips a signed token', async () => {
    const { token, claims } = await issueGuestToken(SECRET, 'guest1234567890', 'iph123');
    const verified = await verifyGuestToken(token, SECRET);
    expect(verified.sub).toBe('guest1234567890');
    expect(verified.role).toBe('guest');
    expect(verified.iph).toBe('iph123');
    expect(verified.exp).toBe(claims.exp);
  });

  it('rejects a token signed with another secret', async () => {
    const { token } = await issueGuestToken(SECRET, 'guest1234567890', 'iph');
    await expect(verifyGuestToken(token, `${SECRET}y`)).rejects.toBeInstanceOf(GuestTokenError);
  });

  it('rejects tampered payloads', async () => {
    const { token } = await issueGuestToken(SECRET, 'guest1234567890', 'iph');
    const [head, , signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'attacker12345678', role: 'guest', iph: 'iph', iat: 1, exp: 9999999999 }))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    await expect(verifyGuestToken(`${head}.${forged}.${signature}`, SECRET)).rejects.toMatchObject({
      code: 'bad_signature',
    });
  });

  it('rejects expired tokens', async () => {
    const { token } = await issueGuestToken(SECRET, 'guest1234567890', 'iph', -60);
    await expect(verifyGuestToken(token, SECRET)).rejects.toMatchObject({ code: 'expired' });
  });

  it('recognises guest tokens without verifying them', async () => {
    const { token } = await issueGuestToken(SECRET, 'guest1234567890', 'iph');
    expect(looksLikeGuestToken(token)).toBe(true);
    expect(looksLikeGuestToken('not-a-token')).toBe(false);
    expect(looksLikeGuestToken('a.b.c')).toBe(false);
  });

  it('hashes IPs deterministically and secret-bound', async () => {
    const a = await hashIp('203.0.113.7', SECRET);
    const b = await hashIp('203.0.113.7', SECRET);
    const c = await hashIp('203.0.113.7', `${SECRET}z`);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(22);
    expect(a).not.toContain('203');
  });
});
