import { z } from 'zod';
import { emailField, passwordField } from './fields.js';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailField,
  password: passwordField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;