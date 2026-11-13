import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../functions/api/_lib/password';
import { issueUserToken, verifyUserToken } from '../functions/api/_lib/userToken';

describe('password hashing and verification', () => {
  it('hashes and verifies correct password', async () => {
    const password = 'mySecretPassword123!';
    const hash = await hashPassword(password);
    expect(hash).toContain('pbkdf2:100000:');
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const hash = await hashPassword('password123');
    const isValid = await verifyPassword('wrongpassword', hash);
    expect(isValid).toBe(false);
  });
});

describe('user JWT token issuance and verification', () => {
  const secret = 'super-secret-jwt-key-minimum-32-chars-long';

  it('issues and verifies token successfully', async () => {
    const token = await issueUserToken(secret, {
      uid: 'usr_test123',
      email: 'test@example.com',
      name: 'tester',
    });
    expect(typeof token).toBe('string');
    const claims = await verifyUserToken(token, secret);
    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe('usr_test123');
    expect(claims?.email).toBe('test@example.com');
    expect(claims?.name).toBe('tester');
    expect(claims?.role).toBe('user');
  });

  it('rejects token with invalid secret', async () => {
    const token = await issueUserToken(secret, {
      uid: 'usr_test123',
      email: 'test@example.com',
      name: 'tester',
    });
    const claims = await verifyUserToken(token, 'different-secret-key-32-chars-long');
    expect(claims).toBeNull();
  });
});

