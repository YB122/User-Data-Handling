import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/user.model.js';
import { signToken } from '../../src/utils/jwt.js';
import { verifyPassword } from '../../src/utils/password.js';

let app: Express;
let token: string;
let rootUser: Awaited<ReturnType<typeof User.create>>;

function createUser(overrides: Record<string, unknown> = {}) {
  const payload = {
    name: 'Alice Example',
    email: `alice${Math.random().toString(36).slice(2, 10)}@example.com`,
    age: 30,
    password: 'superSecret1',
    ...overrides,
  };
  return request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send(payload);
}

beforeAll(() => {
  app = createApp();
});

beforeEach(async () => {
  rootUser = await User.create({
    name: 'Root User',
    email: `root-${Date.now()}@example.com`,
    password: 'superSecret1',
  });
  token = signToken(rootUser.id);
});

describe('authentication guard', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/users').set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/users', () => {
  it('creates a user profile', async () => {
    const res = await createUser();
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Alice Example', age: 30 });
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('createdAt');
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('normalizes email and strips unknown fields', async () => {
    const res = await createUser({
      email: 'MiXeD@Example.COM ',
      isAdmin: true,
      role: 'root',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('mixed@example.com');
    expect(res.body.data).not.toHaveProperty('isAdmin');
    expect(res.body.data).not.toHaveProperty('role');
  });

  it('rejects duplicate emails with 409', async () => {
    const email = `dup-${Date.now()}@example.com`;
    await createUser({ email }).expect(201);
    const res = await createUser({ email });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects invalid payloads with 400', async () => {
    const res = await createUser({ name: '<script>alert(1)</script>' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toBeTruthy();
  });
});

describe('GET /api/users', () => {
  it('returns paginated results with meta', async () => {
    for (let i = 0; i < 12; i += 1) await createUser();
    const res = await request(app)
      .get('/api/users?limit=5&offset=0')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta).toMatchObject({ total: 13, limit: 5, offset: 0 });
  });

  it('paginates with offset', async () => {
    // 12 created + root user from beforeEach = 13 total
    for (let i = 0; i < 12; i += 1) await createUser();

    const res = await request(app)
      .get('/api/users?limit=5&offset=10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.total).toBe(13);
  });

  it('filters by age', async () => {
    await createUser({ age: 25 });
    await createUser({ age: 25 });
    await createUser({ age: 40 });

    const res = await request(app)
      .get('/api/users?age=25')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.every((u: { age: number }) => u.age === 25)).toBe(true);
  });

  it('rejects NoSQL operator injection in query params', async () => {
    const res = await request(app)
      .get('/api/users?age[$gt]=0')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('rejects an out-of-range limit', async () => {
    const res = await request(app)
      .get('/api/users?limit=999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/users/:id', () => {
  it('fetches a user by id', async () => {
    const created = await createUser();
    const res = await request(app)
      .get(`/api/users/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.body.data.id);
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app)
      .get('/api/users/not-an-object-id')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .get('/api/users/60d21b4667d0d8992e610c85')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PUT /api/users/:id', () => {
  it('updates a user profile', async () => {
    const created = await createUser();
    const id = created.body.data.id;

    const res = await request(app)
      .put(`/api/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Alice Updated', age: 31 });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Alice Updated');
    expect(res.body.data.age).toBe(31);
    expect(res.body.data.id).toBe(id);
  });

  it('rejects updating to an existing email with 409', async () => {
    const a = await createUser();
    const b = await createUser();
    const res = await request(app)
      .put(`/api/users/${b.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: a.body.data.email });
    expect(res.status).toBe(409);
  });

  it('rejects an empty update body', async () => {
    const created = await createUser();
    const res = await request(app)
      .put(`/api/users/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .put('/api/users/60d21b4667d0d8992e610c85')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('updating the password re-hashes it (old password no longer verifies)', async () => {
    const created = await createUser({ email: `pw-${Date.now()}@example.com`, password: 'oldPassword1' });
    await request(app)
      .put(`/api/users/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'newPassword1' })
      .expect(200);

    const dbUser = await User.findById(created.body.data.id).select('+password');
    expect(dbUser).not.toBeNull();
    expect(await verifyPassword('newPassword1', dbUser!.password)).toBe(true);
    expect(await verifyPassword('oldPassword1', dbUser!.password)).toBe(false);
  });
});

describe('DELETE /api/users/:id', () => {
  it('deletes a user profile and returns a confirmation message', async () => {
    const created = await createUser();
    const id = created.body.data.id;

    const res = await request(app)
      .delete(`/api/users/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ message: 'User deleted successfully', id });

    const get = await request(app).get(`/api/users/${id}`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .delete('/api/users/60d21b4667d0d8992e610c85')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});