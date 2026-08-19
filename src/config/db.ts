import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Global mongoose hardening:
 * - sanitizeFilter: strips query-selector operators ($gt, $where, $expr, ...)
 *   from plain filter objects before hitting MongoDB, preventing NoSQL
 *   injection via user-controlled query params.
 * - strictQuery: unlisted fields in queries are removed.
 */
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

/**
 * Serverless-friendly connection: the mongoose connect promise is cached so
 * warm Vercel function invocations reuse the open connection instead of
 * opening a new one per request. If the connection was dropped (readyState 0)
 * the next call reconnects.
 */
let cached: Promise<void> | null = null;

export async function connectDB(uri: string = env.MONGODB_URI): Promise<void> {
  if (!cached || mongoose.connection.readyState === 0) {
    cached = mongoose.connect(uri).then(() => undefined);
  }
  return cached;
}

export async function disconnectDB(): Promise<void> {
  cached = null;
  await mongoose.disconnect();
}