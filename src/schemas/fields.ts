import { z } from 'zod';

const NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{N} .'-]*$/u;

export const nameField = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name cannot exceed 100 characters')
  .regex(NAME_REGEX, 'Name contains invalid characters');

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email cannot exceed 254 characters')
  .email('Invalid email address');

export const ageField = z
  .number()
  .int('Age must be an integer')
  .min(0, 'Age cannot be negative')
  .max(150, 'Age cannot exceed 150')
  .optional();

export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password cannot exceed 72 characters (bcrypt limit)');

export const idField = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format');