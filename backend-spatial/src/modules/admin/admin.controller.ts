/**
 * Safe Yatra — Backend Spatial Server
 * Admin Broadcast & Command Center Controller.
 */

import { Request, Response } from 'express';
import { ok } from '../../utils/response';
import { adminService } from './admin.service';
import {
  broadcastQuerySchema,
  createBroadcastSchema,
} from './admin.validation';

export class AdminController {
  /**
   * POST /api/v1/admin/broadcast
   * Creates and broadcasts a new safety alert to targeted sector.
   */
  public async createBroadcast(req: Request, res: Response): Promise<Response> {
    const validated = createBroadcastSchema.parse(req.body);
    const createdBy = req.user?.id || 'admin_operator';
    const result = await adminService.createBroadcastAlert(validated, createdBy);
    return ok(res, result, undefined, 201);
  }

  /**
   * GET /api/v1/admin/broadcasts
   * Lists active and past safety bulletins.
   */
  public async getAllBroadcasts(req: Request, res: Response): Promise<Response> {
    const validated = broadcastQuerySchema.parse(req.query);
    const results = await adminService.getAllBroadcasts(validated);
    return ok(res, results, undefined, 200);
  }

  /**
   * GET /api/v1/admin/broadcasts/:id
   * Retrieves single safety broadcast detail.
   */
  public async getBroadcastById(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const result = await adminService.getBroadcastById(id);
    return ok(res, result, undefined, 200);
  }

  /**
   * PATCH /api/v1/admin/broadcasts/:id/deactivate
   * Deactivates an active safety broadcast.
   */
  public async deactivateBroadcast(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const result = await adminService.deactivateBroadcast(id);
    return ok(res, result, undefined, 200);
  }
}

export const adminController = new AdminController();
export default adminController;
