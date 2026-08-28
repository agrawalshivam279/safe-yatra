/**
 * Safe Yatra — Backend Spatial Server
 * Zones Express Routes.
 */

import { Router } from 'express';
import { zoneController } from './zone.controller';
import { authenticate, optionalAuthenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();

// Public Zone Discovery Endpoints
router.get('/', optionalAuthenticate, zoneController.getAllZones);
router.get('/:id', optionalAuthenticate, zoneController.getZoneById);

// Admin Protected Zone Operations
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  zoneController.createZone
);

router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  zoneController.updateZone
);

router.patch(
  '/:id/override',
  authenticate,
  requireRole('ADMIN'),
  zoneController.overrideScore
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  zoneController.deleteZone
);

export default router;
