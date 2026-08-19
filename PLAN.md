# Backend Technical Assessment - User Data Handling

## Objective

RESTful API for managing User Profiles (CRUD) with token-based authentication, built with TypeScript, Express, and MongoDB. Modular, scalable, secure.

## Task breakdown & prioritization

| # | Subtask | Priority | Status |
|---|---------|----------|--------|
| 1 | Project scaffold: TypeScript, Express 5, env config, dotenv | P0 | done |
| 2 | Mongoose `User` model + indexes (unique email, age) + pre-save bcrypt hash | P0 | done |
| 3 | Auth: register/login -> JWT (httpOnly cookie + Bearer), `requireAuth` middleware | P0 | done |
| 4 | CRUD endpoints: POST/GET/GET:id/PUT/DELETE `/users` + pagination & age filter | P0 | done |
| 5 | Zod validation (body/params/query) + centralized error handler | P1 | done |
| 6 | Security: helmet, rate limiting, CSRF, input sanitization, NoSQL-injection guards | P1 | done |
| 7 | Unit + integration tests (Vitest + Supertest + mongodb-memory-server) | P2 | done |
| 8 | Swagger API documentation | P3 | done |

Prioritization rationale: P0 items are the functional core required by the
assessment (CRUD + auth + model). P1 items protect the core's correctness and
security. P2/P3 are quality gates and bonus points, done only after the core
is stable.

## Tech stack

- Node.js + TypeScript (strict)
- Express 5
- Mongoose (MongoDB)
- zod (validation)
- jsonwebtoken + bcryptjs (auth)
- helmet, express-rate-limit, cookie-parser, cors (security)
- swagger-ui-express (docs)
- Vitest + Supertest + mongodb-memory-server (tests)

## API overview

All `/users` endpoints require JWT (`Authorization: Bearer <token>` or
httpOnly `token` cookie set by `/auth/login`).

```
POST   /auth/register          Register (name, email, age?, password)
POST   /auth/login             Login -> JWT (cookie + body)
POST   /users                  Create user profile
GET    /users?limit&offset&age Fetch all (paginated, optional age filter)
GET    /users/:id              Fetch one by ID
PUT    /users/:id              Update (partial)
DELETE /users/:id              Delete
GET    /docs                   Swagger UI
GET    /health                 Health check
```

## Security notes

- **XSS**: JSON-only API, helmet headers, zod strips unknown fields and
  restricts lengths.
- **CSRF**: `SameSite=Strict` httpOnly cookie + double-submit CSRF token
  (header must match cookie). Bearer-header clients skip CSRF (no cookie flow).
- **SSRF**: Not applicable - the service performs no outbound URL requests.
- **SQL/NoSQL injection**: MongoDB (non-relational); all queries go through
  Mongoose models with `sanitizeFilter: true`. No raw operators (`$where`,
  `$expr`, `$gt`, ...) are ever derived from user input; query params are
  whitelisted via zod. Email uniqueness enforced by DB unique index + graceful
  409 handling.
- **Passwords**: bcrypt (cost 12). Never logged or returned.
- **Rate limiting**: strict limits on auth endpoints (brute-force protection).
- **Secrets**: `.env` only, `.env.example` committed, never secrets.

## How to run

```bash
npm install
cp .env.example .env   # set MONGODB_URI, JWT_SECRET
npm run dev            # development (tsx watch)
npm run build && npm start  # production
npm test               # unit + integration tests
```

## Folder structure

```
src/
├── config/        # env parsing (zod), db connection
├── models/        # user.model.ts
├── controllers/   # user.controller.ts, auth.controller.ts
├── routes/        # user.routes.ts, auth.routes.ts, docs.ts
├── middleware/    # auth.ts, csrf.ts, error.ts, rateLimit.ts, validate.ts
├── schemas/       # zod schemas (user, auth, query, params)
├── utils/         # jwt.ts, password.ts, apiError.ts, response.ts
└── app.ts / server.ts
```