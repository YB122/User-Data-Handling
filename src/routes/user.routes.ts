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

// Every user endpoint requires a valid JWT (Bearer header or httpOnly cookie).
router.use(requireAuth);

router.post('/', validate({ body: createUserSchema }), createUser);
router.get('/', validate({ query: listQuerySchema }), listUsers);
router.get('/:id', validate({ params: idParamsSchema }), getUserById);
router.put('/:id', validate({ params: idParamsSchema, body: updateUserSchema }), updateUser);
router.delete('/:id', validate({ params: idParamsSchema }), deleteUser);

export default router;