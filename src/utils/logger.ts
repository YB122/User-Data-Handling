import winston from 'winston';
import { env } from '../config/env.js';

/**
 * Centralized logger (winston).
 *
 * Security rules applied on purpose:
 * - Logs NEVER contain request bodies, Authorization headers, cookies or
 *   tokens - passwords and JWTs must never reach the log output.
 * - Structured JSON format in production (easy to ingest/query), human
 *   readable + colors in development.
 * - `error` level only during tests to keep test output clean.
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${rest}`;
  }),
);

export const logger = winston.createLogger({
  // 'http' level so access logs are emitted (npm levels: error 0 .. http 3).
  level: env.NODE_ENV === 'test' ? 'error' : 'http',
  format: env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports: [new winston.transports.Console()],
});