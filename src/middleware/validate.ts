import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

type Schemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

/**
 * Middleware factory: validates request parts against zod schemas and
 * replaces them with the parsed (stripped/typed) values. Anything invalid
 * yields a 400 with a field-level breakdown.
 *
 * Note: `req.query` is a read-only getter in Express 5, so parsed query
 * values are exposed through `req.validatedQuery` instead.
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params) as Request['params'];
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const details = err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        next(ApiError.badRequest('Validation failed', details));
        return;
      }
      next(err);
    }
  };
}