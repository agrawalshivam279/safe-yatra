/**
 * Safe Yatra — Backend Spatial Server
 * SOS SMS Fallback Gateway & Offline Telemetry Encoder/Decoder.
 */

import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { AppError } from '../../utils/response';
import { ParsedSMSPayload, SMSDispatchResult } from './sos.types';

export class SOSSMSService {
  /**
   * Encodes emergency GPS and status telemetry into a compact SMS payload string.
   * Example: "SOS|LAT:18.7546|LNG:73.4062|BAT:23|UID:usr_01"
   */
  public encodeSOSPayload(
    lat: number,
    lng: number,
    battery?: number,
    userId?: string
  ): string {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new AppError('Invalid coordinate boundaries for SMS encoding', 400, 'INVALID_COORDINATES');
    }

    const parts = [
      'SOS',
      `LAT:${lat.toFixed(6)}`,
      `LNG:${lng.toFixed(6)}`,
    ];

    if (battery !== undefined && battery !== null) {
      parts.push(`BAT:${Math.round(battery)}`);
    }

    if (userId) {
      parts.push(`UID:${userId.trim()}`);
    }

    return parts.join('|');
  }

  /**
   * Parses and validates a raw incoming SMS emergency payload.
   */
  public parseSOSPayload(rawText: string): ParsedSMSPayload {
    if (!rawText || typeof rawText !== 'string') {
      throw new AppError('SMS payload must be a non-empty string', 400, 'INVALID_SMS_PAYLOAD');
    }

    const trimmed = rawText.trim();
    const parts = trimmed.split('|').map((p) => p.trim());

    if (parts.length < 3 || parts[0].toUpperCase() !== 'SOS') {
      throw new AppError(
        'Invalid SMS payload format: Expected "SOS|LAT:<lat>|LNG:<lng>..."',
        400,
        'INVALID_SMS_PAYLOAD'
      );
    }

    let lat: number | undefined;
    let lng: number | undefined;
    let battery: number | undefined;
    let userId: string | undefined;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const colonIndex = part.indexOf(':');
      if (colonIndex === -1) continue;

      const key = part.slice(0, colonIndex).toUpperCase();
      const val = part.slice(colonIndex + 1).trim();

      if (key === 'LAT') {
        const parsedLat = parseFloat(val);
        if (!isNaN(parsedLat)) lat = parsedLat;
      } else if (key === 'LNG') {
        const parsedLng = parseFloat(val);
        if (!isNaN(parsedLng)) lng = parsedLng;
      } else if (key === 'BAT') {
        const parsedBat = parseInt(val, 10);
        if (!isNaN(parsedBat)) battery = parsedBat;
      } else if (key === 'UID' || key === 'U') {
        if (val.length > 0) userId = val;
      }
    }

    if (lat === undefined || lng === undefined) {
      throw new AppError(
        'SMS payload is missing valid LAT and LNG coordinates',
        400,
        'INVALID_SMS_PAYLOAD'
      );
    }

    if (lat < -90 || lat > 90) {
      throw new AppError('Latitude in SMS payload must be between -90 and 90', 400, 'INVALID_LATITUDE');
    }

    if (lng < -180 || lng > 180) {
      throw new AppError('Longitude in SMS payload must be between -180 and 180', 400, 'INVALID_LONGITUDE');
    }

    if (battery !== undefined && (battery < 0 || battery > 100)) {
      throw new AppError('Battery in SMS payload must be between 0 and 100', 400, 'INVALID_BATTERY');
    }

    return {
      type: 'SOS',
      lat,
      lng,
      battery,
      userId,
    };
  }

  /**
   * Dispatches an emergency SOS notification via SMS (Simulated vs Live Twilio).
   */
  public async sendSOSviaSMS(
    recipientPhone: string,
    sosId: string,
    lat: number,
    lng: number,
    battery?: number
  ): Promise<SMSDispatchResult> {
    if (!recipientPhone || recipientPhone.trim().length < 6) {
      throw new AppError('Invalid recipient phone number', 400, 'INVALID_PHONE');
    }

    const payload = this.encodeSOSPayload(lat, lng, battery);
    const messageBody = `[SAFE YATRA EMERGENCY] SOS Alert triggered (ID: ${sosId}). Payload: ${payload}`;

    // Simulation / Dev Fallback
    if (
      env.SIMULATION_MODE ||
      !process.env.TWILIO_ACCOUNT_SID ||
      process.env.TWILIO_ACCOUNT_SID.startsWith('mock')
    ) {
      const messageId = `sim_sms_${uuidv4()}`;
      return {
        success: true,
        messageId,
        recipientPhone: recipientPhone.trim(),
        mode: 'SIMULATED',
      };
    }

    // Live Twilio Dispatch (if configured)
    try {
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
        throw new Error('Twilio configuration is incomplete');
      }

      // Dynamic require / client call for Twilio when live credentials exist
      const twilio = require('twilio');
      const client = twilio(twilioAccountSid, twilioAuthToken);
      const message = await client.messages.create({
        body: messageBody,
        from: twilioFromNumber,
        to: recipientPhone.trim(),
      });

      return {
        success: true,
        messageId: message.sid,
        recipientPhone: recipientPhone.trim(),
        mode: 'TWILIO',
      };
    } catch (err: any) {
      throw new AppError(
        `Failed to send SMS via Twilio: ${err.message}`,
        500,
        'SMS_DISPATCH_FAILED'
      );
    }
  }
}

export const sosSMSService = new SOSSMSService();
export default sosSMSService;
