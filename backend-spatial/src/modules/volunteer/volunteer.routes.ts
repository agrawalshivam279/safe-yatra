/**
 * Safe Yatra — Backend Spatial Server
 * Volunteer Express Routes.
 */

import { Router } from 'express';
import { volunteerController } from './volunteer.controller';
import { authenticate, optionalAuthenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();

// Volunteer Registration & Management
router.post('/register', authenticate, volunteerController.register);
router.patch(
  '/duty',
  authenticate,
  requireRole('YAATRI_MITRA', 'ADMIN'),
  volunteerController.toggleDuty
);

// Location Streaming
router.post('/location', authenticate, volunteerController.recordLocation);

// Spatial Proximity Query
router.get('/nearby', optionalAuthenticate, volunteerController.getNearby);

export default router;
