/**
 * Safe Yatra — Backend Spatial Server
 * Geofence Express Routes.
 */

import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { geofenceController } from './geofence.controller';

const router = Router();

// Public Geofence Discovery & Point Checking Endpoints
router.get('/', optionalAuthenticate, geofenceController.getAllGeofences);
router.post('/check', geofenceController.checkPoint);
router.get('/:id', optionalAuthenticate, geofenceController.getGeofenceById);

// Admin Protected Geofence Operations
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  geofenceController.createGeofence
);

router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  geofenceController.updateGeofence
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  geofenceController.deleteGeofence
);

export default router;
