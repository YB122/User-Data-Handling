import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';

let app: Express;

beforeAll(() => {
  app = createApp();
});

afterAll(() => {
  // no-op: DB lifecycle handled in tests/setup.ts
});

describe('POST /api/auth/register', () => {
  it('registers a user and returns a JWT + sets auth cookies', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane Doe', email: 'jane@example.com', password: 'superSecret1' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Jane Doe',
      email: 'jane@example.com',
    });
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body.meta.token).toBeTruthy();

    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('token=') && c.includes('HttpOnly'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('csrfToken='))).toBe(true);
  });

  it('rejects duplicate emails with 409', async () => {
    const payload = { name: 'Jane Doe', email: 'dup@example.com', password: 'superSecret1' };
    await request(app).post('/api/auth/register').send(payload).expect(201);
    const res = await request(app).post('/api/auth/register').send(payload);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 400 for invalid payloads', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'x', email: 'bad-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'John Smith', email: 'john@example.com', password: 'superSecret1' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'superSecret1' });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('john@example.com');
    expect(res.body.meta.token).toBeTruthy();
  });

  it('rejects wrong passwords with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'wrongPassword' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects unknown emails with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'superSecret1' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears cookies', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'John Smith', email: 'john@example.com', password: 'superSecret1' })
      .expect(201);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'superSecret1' })
      .expect(200);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${login.body.meta.token}`);
    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('token=;'))).toBe(true);
  });
});