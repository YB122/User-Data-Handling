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

export async function connectDB(uri: string = env.MONGODB_URI): Promise<void> {
  await mongoose.connect(uri);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}