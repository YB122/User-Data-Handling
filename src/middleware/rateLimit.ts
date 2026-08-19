import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

const isTest = env.NODE_ENV === 'test';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1000 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, _next, options) => {
    throw ApiError.tooManyRequests(
      `Too many requests, please try again after ${Math.ceil(options.windowMs / 60000)} minutes`,
    );
  },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isTest ? 100000 : 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, _next, options) => {
    throw ApiError.tooManyRequests(
      `Too many requests, please try again after ${Math.ceil(options.windowMs / 60000)} minute(s)`,
    );
  },
});