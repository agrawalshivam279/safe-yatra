/**
 * Safe Yatra — Backend Spatial Server
 * SOS Emergency REST Routes.
 */

import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { sosController } from './sos.controller';

export const sosRouter = Router();

// 1. Trigger SOS emergency (Authenticated)
sosRouter.post('/trigger', authenticate, sosController.triggerSOS);

// 2. Active SOS emergency list (Volunteers & Admin)
sosRouter.get(
  '/active',
  authenticate,
  requireRole(UserRole.YAATRI_MITRA, UserRole.ADMIN),
  sosController.getActiveSOS
);

// 3. Inbound SMS emergency webhook (Public for Telecom / Twilio gateways)
sosRouter.post('/sms-webhook', sosController.handleSMSWebhook);

// 4. Single SOS emergency details (Authenticated)
sosRouter.get('/:id', authenticate, sosController.getSOSById);

// 5. Accept SOS rescue mission (Volunteers & Admin)
sosRouter.patch(
  '/:id/accept',
  authenticate,
  requireRole(UserRole.YAATRI_MITRA, UserRole.ADMIN),
  sosController.acceptSOS
);

// 6. Record responder arrival on-scene (Volunteers & Admin)
sosRouter.patch(
  '/:id/arrive',
  authenticate,
  requireRole(UserRole.YAATRI_MITRA, UserRole.ADMIN),
  sosController.arriveSOS
);

// 7. Resolve SOS emergency (Volunteers & Admin)
sosRouter.patch(
  '/:id/resolve',
  authenticate,
  requireRole(UserRole.YAATRI_MITRA, UserRole.ADMIN),
  sosController.resolveSOS
);

// 8. Cancel SOS emergency (Authenticated - tourist/admin)
sosRouter.patch('/:id/cancel', authenticate, sosController.cancelSOS);

export default sosRouter;
