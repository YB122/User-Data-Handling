import { Router } from 'express';
import { login, logout, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { setCsrfCookie } from '../middleware/csrf.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/register', authLimiter, setCsrfCookie, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, setCsrfCookie, validate({ body: loginSchema }), login);
router.post('/logout', requireAuth, logout);

export default router;