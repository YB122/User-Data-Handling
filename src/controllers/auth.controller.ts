import type { Request, Response } from 'express';
import { User } from '../models/user.model.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';
import { ApiError } from '../utils/apiError.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { signToken } from '../utils/jwt.js';
import { verifyPassword } from '../utils/password.js';
import { sendSuccess } from '../utils/response.js';
import { toUserView } from '../utils/userView.js';

const AUTH_COOKIE = 'token';
const CSRF_COOKIE = 'csrfToken';

function setAuthCookies(res: Response, token: string, csrfToken?: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: res.req.secure,
    path: '/',
    maxAge: 60 * 60 * 1000,
  });
  if (csrfToken) {
    res.cookie(CSRF_COOKIE, csrfToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: res.req.secure,
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
}

/** POST /auth/register */
export async function register(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterInput;

  const existing = await User.exists({ email: input.email });
  if (existing) {
    throw ApiError.conflict('Email already registered');
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    password: input.password,
  });

  const token = signToken(user.id);
  const csrfToken = res.req.cookies?.[CSRF_COOKIE] as string | undefined;
  setAuthCookies(res, token, csrfToken);

  sendSuccess(res, HttpStatus.CREATED, toUserView(user), { token });
}

/** POST /auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginInput;

  const user = await User.findOne({ email: input.email }).select('+password');
  if (!user || !(await verifyPassword(input.password, user.password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signToken(user.id);
  const csrfToken = res.req.cookies?.[CSRF_COOKIE] as string | undefined;
  setAuthCookies(res, token, csrfToken);

  sendSuccess(res, HttpStatus.OK, toUserView(user), { token });
}

/** POST /auth/logout - clears cookies (no-op for Bearer clients) */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
  sendSuccess(res, HttpStatus.OK, { message: 'Logged out' });
}