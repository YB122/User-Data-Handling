import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import docsRoutes from './routes/docs.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  // 'extended' parser surfaces nested query objects (e.g. `age[$gt]=0`),
  // which the zod query schema then rejects - explicit NoSQL-injection guard.
  app.set('query parser', 'extended');

  // Security headers (X-Content-Type-Options, CSP, HSTS, ...)
  app.use(helmet());

  /**
   * CORS: `*` allows any origin (convenient for development/public APIs).
   * In PRODUCTION set CORS_ORIGIN to your frontend domain, e.g.
   *   CORS_ORIGIN=https://my-app.vercel.app
   * (or a comma-separated list). Never use `*` together with credentials
   * (cookies) in production - browsers reject wildcard + credentials.
   */
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    }),
  );

  app.use(cookieParser());

  // Body size limits prevent oversized-payload DoS
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', apiLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/docs', docsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}