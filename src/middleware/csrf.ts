import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError.js';

export const CSRF_COOKIE = 'csrfToken';

/**
 * Sets the CSRF double-submit token cookie. Called on auth endpoints so
 * cookie-authenticated browser clients can read the token and echo it back
 * in the `X-CSRF-Token` header.
 */
export function setCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: req.secure,
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  next();
}

/**
 * Double-submit CSRF protection for state-changing methods.
 * Only enforced when the request is authenticated via cookie (browser flow);
 * Bearer-token API clients carry no cookies and are exempt (no CSRF surface).
 */
export function csrfProtect(req: Request, _res: Response, next: NextFunction): void {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const cookieAuth = Boolean(req.cookies?.token);

  if (!mutating || !cookieAuth) {
    next();
    return;
  }

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.[CSRF_COOKIE];

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    next(ApiError.forbidden('CSRF token mismatch'));
    return;
  }
  next();
}