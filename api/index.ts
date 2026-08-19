import express, { type Express } from 'express';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

/**
 * Vercel serverless entrypoint.
 * The whole Express app runs as one serverless function; vercel.json rewrites
 * all routes to this file. The MongoDB connection is established lazily per
 * invocation and cached across warm invocations (see src/config/db.ts).
 */
const app = createApp();

const handler: Express = express();

handler.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

handler.use(app);

handler.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('[ServerlessDbError]', err);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Database connection failed' },
    });
  },
);

export default handler;