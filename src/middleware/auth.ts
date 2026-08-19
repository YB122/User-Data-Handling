import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError.js';
import { verifyToken } from '../utils/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * JWT authentication for protected routes.
 * Accepts the token from:
 *  1. `Authorization: Bearer <token>` (API clients) - CSRF not applicable
 *  2. `token` httpOnly cookie (browser clients) - CSRF handled separately
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    next(ApiError.unauthorized('Missing authentication token'));
    return;
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(ApiError.unauthorized('Token has expired'));
      return;
    }
    next(ApiError.unauthorized('Invalid or malformed token'));
  }
}