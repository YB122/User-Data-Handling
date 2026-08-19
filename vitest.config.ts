import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 90000,
    pool: 'forks',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-0123456789abcdef0123456789abcdef',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/test-placeholder',
    },
  },
});