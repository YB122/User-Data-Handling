import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from '../../src/utils/password.js';
import { signToken, verifyToken } from '../../src/utils/jwt.js';
import { ApiError } from '../../src/utils/apiError.js';

describe('password utils', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).not.toBe('correct horse battery');
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
    expect(await verifyPassword('wrong password', hash)).toBe(false);
  });
});

describe('jwt utils', () => {
  it('signs and verifies a token, returning the user id', () => {
    const token = signToken('60d21b4667d0d8992e610c85');
    expect(verifyToken(token).sub).toBe('60d21b4667d0d8992e610c85');
  });

  it('rejects a tampered token', () => {
    const token = signToken('60d21b4667d0d8992e610c85');
    const [header, payload, signature] = token.split('.');
    const tampered = [header, payload, signature.slice(0, -1) + (signature.endsWith('a') ? 'b' : 'a')].join('.');
    expect(() => verifyToken(tampered)).toThrow(jwt.JsonWebTokenError);
  });

  it('rejects a token signed with a different secret', () => {
    const token = jwt.sign({ sub: 'x' }, 'some-other-secret-that-is-long-enough', {
      issuer: 'user-data-handling',
      audience: 'user-data-handling',
    });
    expect(() => verifyToken(token)).toThrow(jwt.JsonWebTokenError);
  });
});

describe('ApiError', () => {
  it('builds structured errors', () => {
    const err = ApiError.notFound('User not found');
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('User not found');
  });
});