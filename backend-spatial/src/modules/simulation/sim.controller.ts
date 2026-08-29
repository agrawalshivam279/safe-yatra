/**
 * Safe Yatra — Backend Spatial Server
 * Simulation Controller & Environment Guard.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { ok, fail } from '../../utils/response';
import { simService } from './sim.service';
import {
  injectLocationSchema,
  replayTrajectorySchema,
  simulateSOSSchema,
  weatherOverrideSchema,
} from './sim.validation';

/**
 * Simulation Guard Middleware:
 * Rejects requests with 404 NOT_FOUND if SIMULATION_MODE is not enabled.
 */
export const simulationGuard = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!env.SIMULATION_MODE) {
    fail(res, 'NOT_FOUND', 'The requested resource was not found', 404);
    return;
  }
  next();
};

export class SimulationController {
  /**
   * POST /api/v1/sim/location
   * Injects a batch of GPS coordinate records for a user.
   */
  public async injectLocations(req: Request, res: Response): Promise<Response> {
    const validated = injectLocationSchema.parse(req.body);
    const result = await simService.injectLocations(validated);
    return ok(res, result, undefined, 201);
  }

  /**
   * POST /api/v1/sim/trajectory
   * Replays sequential user trajectory waypoints with geofence evaluation.
   */
  public async replayTrajectory(req: Request, res: Response): Promise<Response> {
    const validated = replayTrajectorySchema.parse(req.body);
    const result = await simService.replayTrajectory(validated);
    return ok(res, result, undefined, 200);
  }

  /**
   * POST /api/v1/sim/sos
   * Simulates an automated end-to-end SOS emergency response loop.
   */
  public async simulateSOS(req: Request, res: Response): Promise<Response> {
    const validated = simulateSOSSchema.parse(req.body);
    const result = await simService.simulateSOS(validated);
    return ok(res, result, undefined, 201);
  }

  /**
   * POST /api/v1/sim/weather-override
   * Sets or clears environmental parameter overrides in Redis cache.
   */
  public async overrideWeather(req: Request, res: Response): Promise<Response> {
    const validated = weatherOverrideSchema.parse(req.body);
    const result = await simService.overrideWeather(validated);
    return ok(res, result, undefined, 200);
  }
}

export const simController = new SimulationController();
export default simController;
