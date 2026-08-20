import { describe, expect, it } from 'vitest';
import { createUserSchema, updateUserSchema } from '../../src/schemas/user.schema.js';
import { idParamsSchema, listQuerySchema } from '../../src/schemas/common.schema.js';

describe('createUserSchema', () => {
  const valid = {
    name: 'Jane Doe',
    email: 'Jane@Example.com ',
    age: 29,
    password: 'superSecret1',
  };

  it('accepts a valid payload and normalizes email', () => {
    const result = createUserSchema.parse(valid);
    expect(result.email).toBe('jane@example.com');
  });

  it('rejects a missing name', () => {
    expect(() => createUserSchema.parse({ ...valid, name: '' })).toThrow();
  });

  it('rejects an invalid email', () => {
    expect(() => createUserSchema.parse({ ...valid, email: 'not-an-email' })).toThrow();
  });

  it('rejects a short password', () => {
    expect(() => createUserSchema.parse({ ...valid, password: 'short' })).toThrow();
  });

  it('rejects a negative or non-integer age', () => {
    expect(() => createUserSchema.parse({ ...valid, age: -1 })).toThrow();
    expect(() => createUserSchema.parse({ ...valid, age: 25.5 })).toThrow();
  });

  it('allows a missing age', () => {
    const { age: _age, ...noAge } = valid;
    expect(createUserSchema.parse(noAge).age).toBeUndefined();
  });

  it('strips unknown fields (mass-assignment protection)', () => {
    const result = createUserSchema.parse({ ...valid, isAdmin: true, role: 'root' });
    expect(result).not.toHaveProperty('isAdmin');
    expect(result).not.toHaveProperty('role');
  });

  it('rejects XSS payloads in the name field', () => {
    expect(() =>
      createUserSchema.parse({ ...valid, name: '<script>alert(1)</script>' }),
    ).toThrow();
  });
});

describe('updateUserSchema', () => {
  const valid = { name: 'John Smith', email: 'john@example.com', age: 30, password: 'newPassword1' };

  it('accepts partial updates', () => {
    expect(updateUserSchema.parse({ age: 31 })).toEqual({ age: 31 });
  });

  it('rejects an empty update body', () => {
    expect(() => updateUserSchema.parse({})).toThrow();
  });

  it('validates updated fields', () => {
    expect(() => updateUserSchema.parse({ email: 'nope' })).toThrow();
    expect(() => updateUserSchema.parse({ age: 200 })).toThrow();
  });
});

describe('idParamsSchema', () => {
  it('accepts a valid ObjectId', () => {
    expect(idParamsSchema.parse({ id: '60d21b4667d0d8992e610c85' })).toEqual({
      id: '60d21b4667d0d8992e610c85',
    });
  });

  it('rejects a malformed id', () => {
    expect(() => idParamsSchema.parse({ id: 'not-an-id' })).toThrow();
  });
});

describe('listQuerySchema', () => {
  it('applies defaults when no query is provided', () => {
    expect(listQuerySchema.parse({})).toEqual({ limit: 10, offset: 0 });
  });

  it('coerces string numbers from the query string', () => {
    expect(listQuerySchema.parse({ limit: '25', offset: '5' })).toEqual({ limit: 25, offset: 5 });
  });

  it('clamps limit to 100', () => {
    expect(() => listQuerySchema.parse({ limit: '999' })).toThrow();
  });

  it('parses an optional age filter', () => {
    expect(listQuerySchema.parse({ age: '30' })).toEqual({ limit: 10, offset: 0, age: 30 });
  });

  it('rejects object/operator injection (age[$gt]=30)', () => {
    expect(() => listQuerySchema.parse({ age: { $gt: '30' } })).toThrow();
  });
});