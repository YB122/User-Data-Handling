import { z } from 'zod';
import { idField } from './fields.js';

export const idParamsSchema = z.object({
  id: idField,
});

/**
 * Pagination + filtering query. Query params arrive as strings, so numbers
 * are coerced; any other key (e.g. `$gt`, `age[gte]`, `role`) is stripped by
 * zod, which is the first line of defense against NoSQL operator injection.
 */
export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  age: z.coerce.number().int().min(0).max(150).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;