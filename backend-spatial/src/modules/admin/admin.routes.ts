/**
 * Safe Yatra — Backend Spatial Server
 * Admin Broadcast REST Routes (/api/v1/admin).
 */

import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { adminController } from './admin.controller';

const router = Router();

// ─── BROADCAST ENDPOINTS ────────────────────────

// POST /api/v1/admin/broadcast (Admin only)
router.post(
  '/broadcast',
  authenticate,
  requireRole(UserRole.ADMIN),
  (req, res, next) => {
    adminController.createBroadcast(req, res).catch(next);
  }
);

// GET /api/v1/admin/broadcasts (Authenticated users)
router.get(
  '/broadcasts',
  authenticate,
  (req, res, next) => {
    adminController.getAllBroadcasts(req, res).catch(next);
  }
);

// GET /api/v1/admin/broadcasts/:id (Authenticated users)
router.get(
  '/broadcasts/:id',
  authenticate,
  (req, res, next) => {
    adminController.getBroadcastById(req, res).catch(next);
  }
);

// PATCH /api/v1/admin/broadcasts/:id/deactivate (Admin only)
router.patch(
  '/broadcasts/:id/deactivate',
  authenticate,
  requireRole(UserRole.ADMIN),
  (req, res, next) => {
    adminController.deactivateBroadcast(req, res).catch(next);
  }
);

export default router;
