import type { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  status: number,
  data: T,
  meta?: Record<string, unknown>,
): void {
  res.status(status).json({
    data,
    ...(meta ? { meta } : {}),
  });
}