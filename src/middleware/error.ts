import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(HttpStatus.BAD_REQUEST).json({
      error: { code: 'BAD_REQUEST', message: `Invalid value for field "${err.path}"` },
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    res
      .status(HttpStatus.BAD_REQUEST)
      .json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details } });
    return;
  }

  // MongoDB duplicate key error -> email uniqueness violation
  if (err instanceof Error && 'code' in err && (err as { code: number }).code === 11000) {
    res
      .status(HttpStatus.CONFLICT)
      .json({ error: { code: 'CONFLICT', message: 'Email already exists' } });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res
      .status(HttpStatus.BAD_REQUEST)
      .json({ error: { code: 'BAD_REQUEST', message: 'Malformed JSON body' } });
    return;
  }

  // Unexpected server error - never leak internals to the client,
  // but keep full details in the server-side logs for debugging.
  if (env.NODE_ENV !== 'test') {
    logger.error('[UnhandledError]', { error: err });
  }
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server' },
  });
}