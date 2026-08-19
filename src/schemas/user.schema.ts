import { z } from 'zod';
import { ageField, emailField, nameField, passwordField } from './fields.js';

/**
 * Strict schemas: zod strips unknown keys by default, so mass-assignment
 * attempts (e.g. `isAdmin`) are silently dropped. Field-level constraints
 * keep payloads small and safe (also mitigates XSS payload smuggling).
 */
export const createUserSchema = z.object({
  name: nameField,
  email: emailField,
  age: ageField,
  password: passwordField,
});

export const updateUserSchema = z
  .object({
    name: nameField.optional(),
    email: emailField.optional(),
    age: ageField,
    password: passwordField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;