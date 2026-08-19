/**
 * OpenAPI 3.0 specification for the User Data Handling API.
 * Served interactively at GET /docs (Swagger UI).
 */
export const OpenApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'User Data Handling API',
    version: '1.0.0',
    description:
      'RESTful API managing User Profiles with JWT authentication.\n\n' +
      'Authenticate via `POST /api/auth/login` (or `/register`) and pass the returned token as ' +
      '`Authorization: Bearer <token>`, or use the httpOnly cookie set by the server.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Auth', description: 'Registration, login, logout' },
    { name: 'Users', description: 'CRUD operations for user profiles' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '60d21b4667d0d8992e610c85' },
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          age: { type: 'integer', minimum: 0, maximum: 150, example: 29 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateUserInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100, example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          age: { type: 'integer', minimum: 0, maximum: 150, example: 29 },
          password: { type: 'string', minLength: 8, maxLength: 72, format: 'password' },
        },
      },
      UpdateUserInput: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          age: { type: 'integer', minimum: 0, maximum: 150 },
          password: { type: 'string', minLength: 8, maxLength: 72, format: 'password' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_FAILED' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user and receive a JWT',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserInput' } } },
        },
        responses: {
          201: { description: 'User created + token', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive a JWT',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          200: { description: 'OK + token', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (clears cookies)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/api/users': {
      post: {
        tags: ['Users'],
        summary: 'Create a new user profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserInput' } } },
        },
        responses: {
          201: { description: 'User created', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Missing/invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Email already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      get: {
        tags: ['Users'],
        summary: 'List all user profiles (paginated, optional age filter)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Page size' },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 }, description: 'Skip N records' },
          { name: 'age', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 150 }, description: 'Filter by exact age' },
        ],
        responses: {
          200: { description: 'Paginated list + meta { total, limit, offset }' },
          401: { description: 'Missing/invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Fetch a user profile by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId' }],
        responses: {
          200: { description: 'User found', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          400: { description: 'Invalid ID format' },
          404: { description: 'User not found' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update an existing user profile',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserInput' } } },
        },
        responses: {
          200: { description: 'Updated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          400: { description: 'Validation failed' },
          404: { description: 'User not found' },
          409: { description: 'Email already exists' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete a user profile by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Deleted' },
          404: { description: 'User not found' },
        },
      },
    },
  },
} as const;