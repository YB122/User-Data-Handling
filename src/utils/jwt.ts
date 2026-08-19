import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface TokenPayload {
  sub: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'user-data-handling',
    audience: 'user-data-handling',
  });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: 'user-data-handling',
    audience: 'user-data-handling',
  });
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }
  return { sub: decoded.sub };
}