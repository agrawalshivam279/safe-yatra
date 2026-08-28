/**
 * Safe Yatra — Backend Spatial Server
 * SOS Emergency Dispatch Controller.
 */

import { NextFunction, Request, Response } from 'express';
import { ok } from '../../utils/response';
import { sosService } from './sos.service';
import { sosSMSService } from './sos.sms';
import {
  cancelSOSSchema,
  resolveSOSSchema,
  smsWebhookSchema,
  triggerSOSSchema,
} from './sos.validation';

export class SOSController {
  /**
   * POST /api/v1/sos/trigger
   * Triggers an emergency SOS event.
   */
  public triggerSOS = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = triggerSOSSchema.parse(req.body);
      const userId = req.user!.id;

      const result = await sosService.triggerSOS({
        userId,
        lat: validated.lat,
        lng: validated.lng,
        altitude: validated.altitude,
        battery: validated.battery,
        audioUrl: validated.audioUrl,
      });

      ok(res, result, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/sos/:id/accept
   * Accepts an emergency rescue mission.
   */
  public acceptSOS = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sosId = req.params.id;
      const volunteerId = req.user!.id;

      const sosEvent = await sosService.acceptSOS(sosId, volunteerId);
      ok(res, { sosEvent });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/sos/:id/arrive
   * Records that volunteer responder arrived on-scene.
   */
  public arriveSOS = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sosId = req.params.id;
      const volunteerId = req.user!.id;

      const sosEvent = await sosService.arriveSOS(sosId, volunteerId);
      ok(res, { sosEvent });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/sos/:id/resolve
   * Resolves an active emergency SOS.
   */
  public resolveSOS = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sosId = req.params.id;
      const validated = resolveSOSSchema.parse(req.body);

      const sosEvent = await sosService.resolveSOS(
        sosId,
        req.user?.id,
        validated.resolutionNotes
      );
      ok(res, { sosEvent });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/sos/:id/cancel
   * Cancels an active emergency SOS.
   */
  public cancelSOS = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sosId = req.params.id;
      const validated = cancelSOSSchema.parse(req.body);
      const userId = req.user!.id;

      const sosEvent = await sosService.cancelSOS(
        sosId,
        userId,
        validated.reason
      );
      ok(res, { sosEvent });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/sos/active
   * Retrieves list of all active SOS emergencies.
   */
  public getActiveSOS = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const events = await sosService.getActiveSOSEvents(50);
      ok(res, { events, count: events.length });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/sos/:id
   * Retrieves full details, timeline, and responses of a single SOS event.
   */
  public getSOSById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sosId = req.params.id;
      const sos = await sosService.getSOSById(sosId);
      ok(res, { sos });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/sos/sms-webhook
   * Ingests incoming offline SMS emergency payloads from telecom gateways.
   */
  public handleSMSWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = smsWebhookSchema.parse(req.body);
      const rawText = validated.Body || validated.body || '';

      const parsedPayload = sosSMSService.parseSOSPayload(rawText);

      // If a userId is present in the SMS payload, we can trigger the SOS
      let triggerResult = null;
      if (parsedPayload.userId) {
        try {
          triggerResult = await sosService.triggerSOS({
            userId: parsedPayload.userId,
            lat: parsedPayload.lat,
            lng: parsedPayload.lng,
            battery: parsedPayload.battery,
          });
        } catch {
          triggerResult = null;
        }
      }

      ok(res, {
        parsed: parsedPayload,
        triggered: triggerResult !== null,
        sosEvent: triggerResult?.sosEvent ?? null,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const sosController = new SOSController();
export default sosController;
