/**
 * Safe Yatra — Backend Spatial Server
 * Authentication Express Routes.
 */

import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Public Authentication Endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Protected User Profile Endpoint
router.get('/me', authenticate, authController.getMe);

export default router;
