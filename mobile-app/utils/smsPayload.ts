/**
 * Safe Yatra — Mobile App
 * Offline Emergency SMS Payload Encoder & Fallback Dispatcher.
 */

import * as SMS from 'expo-sms';
import { Linking } from 'react-native';

export interface SOSPayloadInput {
  lat: number;
  lng: number;
  batteryLevel?: number;
  userId?: string;
  timestamp?: string;
}

export interface SendSMSResult {
  success: boolean;
  result?: string;
  error?: string;
}

/**
 * Encodes compact emergency telemetry payload (<60 characters).
 * Format: SOS|LAT:<lat>|LNG:<lng>|BAT:<bat>|UID:<uid>
 */
export function encodeSOSPayload(input: SOSPayloadInput): string {
  const latStr = Number(input.lat).toFixed(5);
  const lngStr = Number(input.lng).toFixed(5);
  const batStr = input.batteryLevel !== undefined ? Math.round(input.batteryLevel) : 0;
  const uidStr = input.userId ? input.userId.slice(-6) : 'ANON';

  return `SOS|LAT:${latStr}|LNG:${lngStr}|BAT:${batStr}|UID:${uidStr}`;
}

/**
 * Sends emergency SMS via expo-sms or falls back to native phone dialer (tel:112).
 */
export async function sendEmergencySMS(
  input: SOSPayloadInput,
  recipientNumber: string = '112'
): Promise<SendSMSResult> {
  const payload = encodeSOSPayload(input);

  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      const { result } = await SMS.sendSMSAsync([recipientNumber], payload);
      return { success: result === 'sent', result };
    } else {
      // Fallback to direct phone dialer
      await Linking.openURL(`tel:${recipientNumber}`);
      return { success: true, result: 'dialer_opened' };
    }
  } catch (error: any) {
    // If expo-sms throws, attempt direct dialer
    try {
      await Linking.openURL(`tel:${recipientNumber}`);
      return { success: true, result: 'dialer_fallback' };
    } catch (dialerError: any) {
      return {
        success: false,
        error: error?.message || 'Failed to dispatch SMS or open dialer',
      };
    }
  }
}
