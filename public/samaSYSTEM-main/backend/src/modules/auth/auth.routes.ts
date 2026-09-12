import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { loginSchema, registerSchema, refreshSchema, updateProfileSchema, changePasswordSchema, verifyPasswordSchema } from './auth.schema.js';
import * as controller from './auth.controller.js';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.get('/profile', authenticate, controller.profile);
router.put('/profile', authenticate, validate(updateProfileSchema), controller.updateProfile);
router.put('/password', authenticate, validate(changePasswordSchema), controller.changePassword);
router.post('/verify-password', authenticate, validate(verifyPasswordSchema), controller.verifyPassword);

export default router;
