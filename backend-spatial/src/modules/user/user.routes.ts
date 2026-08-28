/**
 * Safe Yatra — Backend Spatial Server
 * User Profile Express Routes.
 */

import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Protected User Profile Endpoints
router.get('/me', authenticate, userController.getMe);
router.patch('/profile', authenticate, userController.updateProfile);
router.delete('/account', authenticate, userController.deleteAccount);

export default router;
