/**
 * Safe Yatra — Backend Spatial Server
 * Danger Score Express Routes.
 */

import { Router } from 'express';
import { dangerController } from './danger.controller';
import { optionalAuthenticate } from '../../middleware/auth';

const router = Router();

// Public / Authenticated Danger Queries
router.get('/score', optionalAuthenticate, dangerController.getScore);
router.get('/zones', optionalAuthenticate, dangerController.getZones);
router.get(
  '/briefing/:destination',
  optionalAuthenticate,
  dangerController.getBriefing
);

export default router;
