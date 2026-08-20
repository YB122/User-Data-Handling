import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

/**
 * HTTP access log middleware.
 *
 * Security: only method, path, status code and duration are logged.
 * Request bodies, Authorization headers, cookies and query values are never
 * written to the log output (no passwords, tokens or PII in logs).
 */
export function httpLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  res.on('finish', () => {
    logger.http(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`);
  });

  next();
}