import { Router } from 'express';
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema, listQuerySchema } from '../schemas/common.schema.js';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema.js';

const router = Router();

// POST /api/users is public (registration-style creation).
// All other endpoints require a valid JWT (Bearer header or httpOnly cookie).
router.post('/', validate({ body: createUserSchema }), createUser);
router.get('/', requireAuth, validate({ query: listQuerySchema }), listUsers);
router.get('/:id', requireAuth, validate({ params: idParamsSchema }), getUserById);
router.put('/:id', requireAuth, validate({ params: idParamsSchema, body: updateUserSchema }), updateUser);
router.delete('/:id', requireAuth, validate({ params: idParamsSchema }), deleteUser);

export default router;