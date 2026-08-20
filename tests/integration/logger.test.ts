import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Writable } from 'node:stream';
import request from 'supertest';
import type { Express } from 'express';
import winston from 'winston';
import { createApp } from '../../src/app.js';
import { logger } from '../../src/utils/logger.js';

/**
 * Security guarantee: access logs and error logs must never contain
 * passwords, JWTs or request bodies.
 */
const captured: string[] = [];

const captureStream = new Writable({
  write(chunk, _encoding, callback) {
    captured.push(chunk.toString());
    callback();
  },
});

let app: Express;
let originalLevel: string;

beforeAll(() => {
  originalLevel = logger.level;
  logger.level = 'http'; // tests run at 'error' level by default; enable http logs
  logger.add(new winston.transports.Stream({ stream: captureStream }));
  app = createApp();
});

afterAll(() => {
  logger.level = originalLevel;
});

describe('logging security', () => {
  it('logs HTTP access without leaking password or token', async () => {
    const create = await request(app)
      .post('/api/users')
      .send({ name: 'Jane Doe', email: 'log-sec@example.com', age: 30, password: 'superSecret1' });
    expect(create.status).toBe(201);

    const token = create.body.meta.token as string;

    // Protected endpoints with the token and without it (200 and 401)
    await request(app).get('/api/users').set('Authorization', `Bearer ${token}`).expect(200);
    await request(app).get('/api/users').expect(401);

    const logs = captured.join('\n');

    // Access lines are logged (method, path, status)
    expect(logs).toContain('POST /api/users -> 201');
    expect(logs).toContain('GET /api/users -> 200');
    expect(logs).toContain('GET /api/users -> 401');

    // Sensitive data never appears in logs
    expect(logs).not.toContain('superSecret1');
    expect(logs).not.toContain(token);
    expect(logs).not.toContain('log-sec@example.com');
  });
});