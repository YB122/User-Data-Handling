# User Data Handling API

RESTful API for managing User Profiles with JWT authentication — built with
**TypeScript, Express 5, MongoDB (Mongoose)** and hardened against common web
vulnerabilities. Written as a backend technical assessment (CRUD + auth +
validation + security + tests + documentation).

- Interactive docs: `GET /docs` (Swagger UI)
- Health check: `GET /health`
- Tests: 55 unit + integration tests (Vitest + Supertest + mongodb-memory-server)

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [API reference](#api-reference)
7. [Error format](#error-format)
8. [Authentication & CSRF](#authentication--csrf)
9. [Security measures](#security-measures)
10. [Testing](#testing)
11. [Vercel deployment](#vercel-deployment)
12. [Task breakdown](#task-breakdown)

---

## Features

- CRUD for User Profiles: `id`, `name`, `email` (unique), `age`, `password`, `createdAt`
- Token-based authentication (JWT) protecting all `/users` endpoints
- Pagination (`limit`/`offset`) + optional filtering by `age`
- Field-level validation with **zod**
- Centralized error handling with consistent error format
- Security: helmet, rate limiting, CSRF protection, NoSQL-injection guards,
  bcrypt password hashing, input sanitization
- Unit + integration tests, Swagger documentation

## Tech stack

| Concern       | Library                          |
| ------------- | -------------------------------- |
| Runtime       | Node.js >= 20                    |
| Language      | TypeScript (strict)              |
| Framework     | Express 5                        |
| Database      | MongoDB + Mongoose 9             |
| Validation    | zod                              |
| Auth          | jsonwebtoken + bcryptjs          |
| Security      | helmet, express-rate-limit, cookie-parser, cors |
| Docs          | swagger-ui-express               |
| Tests         | Vitest, Supertest, mongodb-memory-server |

## Project structure

```
├── api/index.ts            # Vercel serverless entrypoint
├── src/
│   ├── app.ts              # Express app assembly (middleware, routes)
│   ├── server.ts           # Local dev/production server entrypoint
│   ├── config/
│   │   ├── env.ts          # Environment parsing/validation (zod)
│   │   └── db.ts           # Mongoose connection (serverless-cached)
│   ├── models/
│   │   └── user.model.ts   # User schema, indexes, pre-save bcrypt hash
│   ├── controllers/
│   │   ├── auth.controller.ts   # register / login / logout
│   │   └── user.controller.ts   # CRUD
│   ├── middleware/
│   │   ├── auth.ts         # JWT verification (Bearer or cookie)
│   │   ├── csrf.ts         # Double-submit CSRF protection
│   │   ├── error.ts        # 404 + centralized error handler
│   │   ├── rateLimit.ts    # Per-endpoint rate limits
│   │   └── validate.ts     # zod validation middleware
│   ├── routes/             # auth.routes.ts, user.routes.ts, docs.routes.ts, openapi.ts
│   ├── schemas/            # zod schemas (fields, user, auth, common)
│   └── utils/              # jwt, password, apiError, httpStatus, response, userView
├── tests/
│   ├── setup.ts            # in-memory MongoDB lifecycle
│   ├── unit/               # schema + util unit tests
│   └── integration/        # auth + users API tests
├── vercel.json             # Vercel serverless config
└── PLAN.md                 # Task breakdown & prioritization
```

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    edit .env: set MONGODB_URI and JWT_SECRET (min 32 chars)

# 3. Run locally (requires a running MongoDB instance)
npm run dev
# -> http://localhost:3000  |  Swagger UI: http://localhost:3000/docs

# 4. Production build & start
npm run build
npm start
```

## Environment variables

| Variable        | Required | Default | Description                                                  |
| --------------- | -------- | ------- | ------------------------------------------------------------ |
| `NODE_ENV`      | no       | `development` | `development` \| `test` \| `production`               |
| `PORT`          | no       | `3000`  | Port for the local server                                    |
| `MONGODB_URI`   | **yes**  | —       | MongoDB connection string                                    |
| `JWT_SECRET`    | **yes**  | —       | JWT signing secret, **at least 32 characters**               |
| `JWT_EXPIRES_IN`| no       | `1h`    | Token lifetime (jsonwebtoken syntax, e.g. `7d`, `15m`)        |
| `CORS_ORIGIN`   | no       | `*`     | Allowed origin(s), comma-separated. **Production:** set your frontend domain, e.g. `https://my-app.vercel.app`. Never use `*` together with cookie credentials in production. |

---

## API reference

**Base URL:** `http://localhost:3000` (or your deployed URL)

All `User` objects are returned **without the password**:

```json
{
  "id": "60d21b4667d0d8992e610c85",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "age": 29,
  "createdAt": "2026-08-19T23:06:59.037Z",
  "updatedAt": "2026-08-19T23:06:59.037Z"
}
```

### Auth

#### POST `/api/auth/register` — create an account

**Body**

```json
{
  "name": "Jane Doe",            // required, 2-100 chars
  "email": "jane@example.com",   // required, unique, normalized to lowercase
  "password": "superSecret1"     // required, 8-72 chars
}
```

**Response `201 Created`** — user + JWT (`meta.token`). Also sets the `token` and `csrfToken` httpOnly cookies:

```json
{
  "data": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "createdAt": "2026-08-19T23:06:59.037Z",
    "updatedAt": "2026-08-19T23:06:59.037Z"
  },
  "meta": { "token": "eyJhbGciOiJIUzI1NiIs..." }
}
```

Errors: `400` invalid payload · `409` email already registered · `429` too many attempts

#### POST `/api/auth/login` — obtain a token

**Body**

```json
{ "email": "jane@example.com", "password": "superSecret1" }
```

**Response `200 OK`** — same shape as register (user + `meta.token` + cookies)

Errors: `400` invalid payload · `401` wrong email/password · `429`

#### POST `/api/auth/logout` — invalidate browser session

Requires auth. Clears the auth cookies.

**Response `200 OK`**

```json
{ "data": { "message": "Logged out" } }
```

---

### Users (all endpoints require auth)

Every request needs either:
- header `Authorization: Bearer <token>`, **or**
- the `token` httpOnly cookie (browser flow — then a matching `X-CSRF-Token` header is also required on state-changing requests)

#### POST `/api/users` — create a user profile

**Body**

```json
{
  "name": "Jane Doe",            // required
  "email": "jane@example.com",   // required, unique
  "age": 29,                     // optional, 0-150
  "password": "superSecret1"     // required, 8-72 chars
}
```

**Response `201 Created`**

```json
{ "data": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "age": 29, "createdAt": "...", "updatedAt": "..." } }
```

Errors: `400` invalid payload · `401` missing/invalid token · `403` CSRF (cookie flow) · `409` duplicate email

#### GET `/api/users` — list users (paginated, optional age filter)

**Query params**

| Param    | Type    | Default | Notes                          |
| -------- | ------- | ------- | ------------------------------ |
| `limit`  | integer | `10`    | 1-100                          |
| `offset` | integer | `0`     | skip N records                 |
| `age`    | integer | —       | filter by exact age (0-150)    |

**Response `200 OK`**

```json
{
  "data": [ { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "age": 29, "createdAt": "...", "updatedAt": "..." } ],
  "meta": { "total": 42, "limit": 10, "offset": 0 }
}
```

Errors: `400` invalid query params · `401`

#### GET `/api/users/:id` — fetch one user

`id` must be a valid MongoDB ObjectId (24 hex chars).

**Response `200 OK`** — single user object in `data` (same shape as above)

Errors: `400` malformed id · `401` · `404` not found

#### PUT `/api/users/:id` — update a user profile

Partial update: **at least one field is required**.

**Body**

```json
{ "name": "Jane Smith", "age": 30, "password": "newPassword1" }
```

**Response `200 OK`** — the updated user object

Errors: `400` invalid/empty payload · `401` · `403` · `404` not found · `409` email already in use by another user

> Updating `password` re-hashes it; the new password is required on subsequent logins.

#### DELETE `/api/users/:id` — delete a user profile

**Response `204 No Content`** — empty body

Errors: `400` malformed id · `401` · `404` not found

### Misc

#### GET `/health` — liveness probe

**Response `200 OK`** — `{ "status": "ok" }`

#### GET `/docs` — Swagger UI

Interactive OpenAPI documentation for every endpoint, with schemas and examples.

---

## Error format

All errors use a consistent envelope:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "details": [ { "path": "email", "message": "Invalid email address" } ]
  }
}
```

| HTTP | Code                  | When                                              |
| ---- | --------------------- | ------------------------------------------------- |
| 400  | `BAD_REQUEST`         | Malformed JSON, invalid id format, invalid query  |
| 400  | `VALIDATION_ERROR`    | Mongoose-level validation failure                 |
| 401  | `UNAUTHORIZED`        | Missing/expired/invalid token, bad credentials    |
| 403  | `FORBIDDEN`           | CSRF token mismatch                               |
| 404  | `NOT_FOUND`           | Unknown route or resource                         |
| 409  | `CONFLICT`            | Duplicate email                                   |
| 429  | `TOO_MANY_REQUESTS`   | Rate limit exceeded                               |
| 500  | `INTERNAL_ERROR`      | Unexpected server error (no internals leaked)     |

## Authentication & CSRF

- **JWT delivery** — the same token works two ways:
  1. `Authorization: Bearer <token>` — for API clients (mobile, curl, Postman).
  2. `token` httpOnly, `SameSite=Strict` cookie — for browser frontends; `secure` in production.
- **CSRF** — browsers authenticating via cookies must echo the `csrfToken` cookie value in the `X-CSRF-Token` header for `POST`/`PUT`/`DELETE`. Bearer-header clients are exempt (no cookie = no CSRF surface).

**Quick start with curl:**

```bash
# 1. Register (returns a token)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"superSecret1"}'

# 2. Use the token (paste your own)
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <TOKEN>"

# 3. Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Smith","email":"john@example.com","age":31,"password":"superSecret1"}'
```

## Security measures

| Threat                | Mitigation                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| **XSS**               | JSON-only API; helmet security headers; zod strips unknown keys; strict name regex and length limits |
| **CSRF**              | `SameSite=Strict` httpOnly cookies + double-submit token check             |
| **NoSQL injection**   | `sanitizeFilter: true` (strips `$gt`, `$where`, `$expr`, ...), extended query parser so `age[$gt]=0` becomes a rejectable object, zod whitelists query params |
| **SQL injection**     | N/A — MongoDB is non-relational; no string-built queries anywhere          |
| **SSRF**              | N/A — the service performs no outbound requests                            |
| **Password storage**  | bcrypt, cost factor 12; `password` never selected/returned                 |
| **Brute force**       | Rate limits: 10 auth attempts / 15 min, 120 requests / min globally        |
| **Mass assignment**   | zod strips unknown body keys (e.g. `isAdmin`)                              |
| **DoS**               | `express.json({ limit: '10kb' })`, capped pagination (max 100)             |
| **Info leakage**      | `x-powered-by` disabled; 500 responses never include stack traces          |
| **Secrets**           | `.env` only; `.env.example` committed; `JWT_SECRET` validated (>= 32 chars)|

## Testing

```bash
npm test          # run all unit + integration tests
npm run test:watch
```

Coverage:

- **Unit** — zod schemas (valid/invalid/edge cases, mass-assignment stripping,
  operator-injection rejection), JWT sign/verify (tampered token), bcrypt,
  ApiError.
- **Integration** (in-memory MongoDB) — full auth flow, all CRUD endpoints,
  pagination, age filtering, duplicate emails (409), auth guard (401),
  NoSQL-injection rejection (400), CSRF enforcement (403), password re-hash
  on update, 404s and validation errors.

## Vercel deployment

The API runs on Vercel as a single serverless function (`api/index.ts`, routed
by `vercel.json`). The Mongoose connection is cached across warm invocations
to avoid exhausting connection limits.

1. Push the repo to GitHub and import it in Vercel.
2. Set environment variables in the Vercel dashboard:
   - `MONGODB_URI` — e.g. a MongoDB Atlas connection string
   - `JWT_SECRET` — at least 32 characters
   - `CORS_ORIGIN` — your frontend domain, e.g. `https://my-app.vercel.app`
     (production; `*` is fine for development only)
   - `NODE_ENV=production`
3. Deploy. The serverless function automatically handles all routes.

## Task breakdown

The full subtask breakdown and prioritization live in
[`PLAN.md`](./PLAN.md) (P0 core → P1 correctness/security → P2 tests → P3 docs).

| # | Subtask                                              | Priority | Status |
| - | ---------------------------------------------------- | -------- | ------ |
| 1 | Project scaffold (TypeScript, Express 5, env config) | P0       | done   |
| 2 | User model + indexes (unique email, age) + bcrypt    | P0       | done   |
| 3 | Auth: register/login → JWT, `requireAuth`            | P0       | done   |
| 4 | CRUD endpoints + pagination + age filter             | P0       | done   |
| 5 | Zod validation + centralized error handler           | P1       | done   |
| 6 | Security: helmet, rate limits, CSRF, injection guards| P1       | done   |
| 7 | Unit + integration tests                             | P2       | done   |
| 8 | Swagger docs + Vercel deployment                     | P3       | done   |