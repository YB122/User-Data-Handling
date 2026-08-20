# User Data Handling API

RESTful API for managing User Profiles with JWT authentication — built with
**TypeScript, Express 5, MongoDB (Mongoose)** and hardened against common web
vulnerabilities. Written as a backend technical assessment.

- Tests: 44 unit + integration tests (Vitest + Supertest + mongodb-memory-server)

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [API reference](#api-reference)
7. [Error format](#error-format)
8. [Authentication](#authentication)
9. [Security measures](#security-measures)
10. [Testing](#testing)
11. [Vercel deployment](#vercel-deployment)
12. [Task breakdown](#task-breakdown)

---

## Features

- The API exposes exactly **5 endpoints** for User Profiles:

  | Method | Endpoint         | Auth | Description                                    |
  | ------ | ---------------- | ---- | ---------------------------------------------- |
  | POST   | `/api/users`     | none | Create a new user profile (public)             |
  | GET    | `/api/users`     | JWT  | Fetch all user profiles (pagination + age filter) |
  | GET    | `/api/users/:id` | JWT  | Fetch a specific user profile by ID            |
  | PUT    | `/api/users/:id` | JWT  | Update an existing user profile                |
  | DELETE | `/api/users/:id` | JWT  | Delete a user profile by ID                    |

- `POST /api/users` is **public** (registration-style creation — no token needed).
- The remaining 4 endpoints require token-based authentication (JWT).
- User fields: `id` (auto), `name` (required), `email` (unique, required),
  `age` (optional), `password`, `createdAt`/`updatedAt` (auto)
- Pagination (`limit`/`offset`) + optional filtering by `age`
- Field-level validation with **zod** (input destructured and whitelisted before persistence)
- Centralized error handling with a consistent error envelope
- Security: helmet, rate limiting, NoSQL-injection guards, bcrypt password hashing, input sanitization

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
| Tests         | Vitest, Supertest, mongodb-memory-server |

## Project structure

```
├── api/index.ts            # Vercel serverless entrypoint
├── scripts/
│   └── generate-token.ts   # dev script to issue a JWT for testing
├── src/
│   ├── app.ts              # Express app assembly (middleware, routes)
│   ├── server.ts           # Local dev/production server entrypoint
│   ├── config/
│   │   ├── env.ts          # Environment parsing/validation (zod)
│   │   └── db.ts           # Mongoose connection (serverless-cached)
│   ├── models/
│   │   └── user.model.ts   # User schema, indexes, pre-save bcrypt hash
│   ├── controllers/
│   │   └── user.controller.ts   # CRUD handlers
│   ├── middleware/
│   │   ├── auth.ts         # JWT verification (Bearer or cookie)
│   │   ├── error.ts        # 404 + centralized error handler
│   │   ├── rateLimit.ts    # Global API rate limit
│   │   └── validate.ts     # zod validation middleware
│   ├── routes/
│   │   └── user.routes.ts  # the 5 user endpoints
│   ├── schemas/            # zod schemas (fields, user, common)
│   └── utils/              # jwt, password, apiError, httpStatus, response, userView
├── tests/
│   ├── setup.ts            # in-memory MongoDB lifecycle
│   ├── unit/               # schema + util unit tests
│   └── integration/        # users API tests (CRUD, auth guard, injection)
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
# -> http://localhost:3000

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

### POST `/api/users` — create a user profile

**Public endpoint — no token required.** The response includes a JWT so the
new user can immediately call the protected endpoints.

**Body** (only `name`, `email`, `age`, `password` are accepted; anything else is stripped):

```json
{
  "name": "Jane Doe",            // required, 2-100 chars
  "email": "jane@example.com",   // required, unique, normalized to lowercase
  "age": 29,                     // optional, 0-150
  "password": "superSecret1"     // required, 8-72 chars
}
```

**Response `201 Created`**

```json
{
  "data": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "age": 29,
    "createdAt": "2026-08-19T23:06:59.037Z",
    "updatedAt": "2026-08-19T23:06:59.037Z"
  },
  "meta": { "token": "eyJhbGciOiJIUzI1NiIs..." }
}
```

Errors: `400` invalid payload · `409` duplicate email

### GET `/api/users` — list users (paginated, optional age filter)

**Requires auth: `Authorization: Bearer <token>`**

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

### GET `/api/users/:id` — fetch one user

`id` must be a valid MongoDB ObjectId (24 hex characters).

**Response `200 OK`** — single user object in `data`

Errors: `400` malformed id · `401` · `404` not found

### PUT `/api/users/:id` — update a user profile

Partial update: **at least one field is required**; only whitelisted, provided fields are applied.

**Body**

```json
{ "name": "Jane Smith", "age": 30, "password": "newPassword1" }
```

**Response `200 OK`** — the updated user object

Errors: `400` invalid/empty payload · `401` · `404` not found · `409` email already in use by another user

> Updating `password` re-hashes it (bcrypt); the old password no longer verifies.

### DELETE `/api/users/:id` — delete a user profile

**Response `200 OK`** — confirmation message

```json
{ "data": { "message": "User deleted successfully", "id": "60d21b4667d0d8992e610c85" } }
```

Errors: `400` malformed id · `401` · `404` not found

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
| 401  | `UNAUTHORIZED`        | Missing/expired/invalid token                     |
| 404  | `NOT_FOUND`           | Unknown route or resource                         |
| 409  | `CONFLICT`            | Duplicate email                                   |
| 429  | `TOO_MANY_REQUESTS`   | Rate limit exceeded                               |
| 500  | `INTERNAL_ERROR`      | Unexpected server error (no internals leaked)     |

## Authentication

`POST /api/users` is public and returns a JWT with the created user — that's
the simplest way to get a token:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","age":29,"password":"superSecret1"}'
# -> { "data": { ... }, "meta": { "token": "<TOKEN>" } }
```

There is also a dev script that issues a token for any email (without hitting
the API), useful when you don't want to create a new user:

```bash
npm run token -- alice@example.com
# -> eyJhbGciOiJIUzI1NiIs...
```

Then send the token on the protected endpoints:

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <TOKEN>"
```

**JWT delivery** — the token can be sent two ways:

1. `Authorization: Bearer <token>` — for API clients (curl, Postman, mobile).
2. `token` httpOnly, `SameSite=Strict` cookie — for browser frontends (`secure` in production).

**Full curl walkthrough:**

```bash
# 1. Create a user - the response includes a token
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Smith","email":"john@example.com","age":31,"password":"superSecret1"}'
# -> { ..., "meta": { "token": "<TOKEN>" } }
TOKEN=<TOKEN>

# 2. List users (paginated + age filter)
curl "http://localhost:3000/api/users?limit=10&offset=0&age=31" \
  -H "Authorization: Bearer $TOKEN"

# 3. Get one user
curl http://localhost:3000/api/users/60d21b4667d0d8992e610c85 \
  -H "Authorization: Bearer $TOKEN"

# 4. Update a user
curl -X PUT http://localhost:3000/api/users/60d21b4667d0d8992e610c85 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"age":32}'

# 5. Delete a user
curl -X DELETE http://localhost:3000/api/users/60d21b4667d0d8992e610c85 \
  -H "Authorization: Bearer $TOKEN"
```

## Security measures

| Threat                | Mitigation                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| **XSS**               | JSON-only API; helmet security headers; zod strips unknown keys; strict name regex and length limits |
| **NoSQL injection**   | `sanitizeFilter: true` (strips `$gt`, `$where`, `$expr`, ...), extended query parser so `age[$gt]=0` becomes a rejectable object, zod whitelists query params |
| **SQL injection**     | N/A — MongoDB is non-relational; no string-built queries anywhere          |
| **SSRF**              | N/A — the service performs no outbound requests                            |
| **Password storage**  | bcrypt, cost factor 12; `password` never selected/returned                 |
| **Mass assignment**   | zod strips unknown body keys plus explicit destructuring/whitelisting in the controller |
| **Brute force**       | Global rate limit: 120 requests / min per IP                              |
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
- **Integration** (in-memory MongoDB) — full CRUD on all 5 endpoints,
  pagination, age filtering, duplicate emails (409), auth guard (401),
  NoSQL-injection rejection (400), password re-hash on update, 404s and
  validation errors.

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
| 3 | Auth: JWT middleware + token issuance script         | P0       | done   |
| 4 | CRUD endpoints + pagination + age filter             | P0       | done   |
| 5 | Zod validation + centralized error handler           | P1       | done   |
| 6 | Security: helmet, rate limits, injection guards      | P1       | done   |
| 7 | Unit + integration tests                             | P2       | done   |
| 8 | Vercel deployment                                   | P3       | done   |