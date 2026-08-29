/**
 * Safe Yatra — Backend Spatial Server
 * Simulation REST Routes (/api/v1/sim).
 */

import { Router } from 'express';
import { simController, simulationGuard } from './sim.controller';

const router = Router();

// Apply simulation environment guard to all simulation endpoints
router.use(simulationGuard);

// Route definitions
router.post('/location', (req, res, next) => {
  simController.injectLocations(req, res).catch(next);
});

router.post('/trajectory', (req, res, next) => {
  simController.replayTrajectory(req, res).catch(next);
});

export default router;
