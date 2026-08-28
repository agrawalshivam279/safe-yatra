/**
 * Safe Yatra — Backend Spatial Server
 * Unit tests for SOS Proximity Matcher & SMS Gateway.
 */

import { UserRole, VerificationStatus } from '@prisma/client';
import { sosMatcher } from '../src/modules/sos/sos.matcher';
import { sosSMSService } from '../src/modules/sos/sos.sms';
import { volunteerService } from '../src/modules/volunteer/volunteer.service';

// Mock VolunteerService
jest.mock('../src/modules/volunteer/volunteer.service', () => ({
  volunteerService: {
    findNearbyVolunteers: jest.fn(),
  },
}));

describe('SOS Proximity Matcher & SMS Gateway (Step 4.9a)', () => {
  const mockDate = new Date('2026-08-29T00:00:00.000Z');

  const mockVolunteers = [
    {
      userId: 'mitra_01',
      name: 'Ramesh Patel',
      phone: '+919876543210',
      role: UserRole.YAATRI_MITRA,
      verificationStatus: VerificationStatus.VERIFIED,
      isOnDuty: true,
      rating: 4.9,
      totalResponses: 15,
      location: {
        lat: 18.756,
        lng: 73.407,
        altitude: 620,
        battery: 88,
        lastPing: mockDate,
      },
      distanceMeters: 240,
      estimatedEtaSeconds: 120,
    },
    {
      userId: 'mitra_02',
      name: 'Suresh Kumar',
      phone: '+919876543211',
      role: UserRole.YAATRI_MITRA,
      verificationStatus: VerificationStatus.VERIFIED,
      isOnDuty: true,
      rating: 4.8,
      totalResponses: 8,
      location: {
        lat: 18.759,
        lng: 73.411,
        altitude: 610,
        battery: 75,
        lastPing: mockDate,
      },
      distanceMeters: 650,
      estimatedEtaSeconds: 223,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SOSMatcher (sos.matcher.ts)', () => {
    it('should match nearby volunteers and determine nearest volunteer and ETA', async () => {
      (volunteerService.findNearbyVolunteers as jest.Mock).mockResolvedValue(mockVolunteers);

      const result = await sosMatcher.matchVolunteers(18.7546, 73.4062, 5000, 10);

      expect(volunteerService.findNearbyVolunteers).toHaveBeenCalledWith(
        18.7546,
        73.4062,
        5000,
        10
      );
      expect(result.volunteerCount).toBe(2);
      expect(result.nearestVolunteer?.userId).toBe('mitra_01');
      expect(result.nearestEtaSeconds).toBe(120);
      expect(result.volunteers).toHaveLength(2);
    });

    it('should handle zero volunteers in sector gracefully without errors', async () => {
      (volunteerService.findNearbyVolunteers as jest.Mock).mockResolvedValue([]);

      const result = await sosMatcher.matchVolunteers(18.7000, 73.3000, 5000);

      expect(result.volunteerCount).toBe(0);
      expect(result.volunteers).toEqual([]);
      expect(result.nearestVolunteer).toBeUndefined();
      expect(result.nearestEtaSeconds).toBeUndefined();
    });
  });

  describe('SOSSMSService — Telemetry Encoding & Parsing (sos.sms.ts)', () => {
    describe('encodeSOSPayload', () => {
      it('should encode full telemetry payload with coordinates, battery, and userId', () => {
        const payload = sosSMSService.encodeSOSPayload(18.7546, 73.4062, 23.4, 'usr_tourist_01');
        expect(payload).toBe('SOS|LAT:18.754600|LNG:73.406200|BAT:23|UID:usr_tourist_01');
      });

      it('should encode payload omitting optional battery and userId', () => {
        const payload = sosSMSService.encodeSOSPayload(18.7546, 73.4062);
        expect(payload).toBe('SOS|LAT:18.754600|LNG:73.406200');
      });

      it('should reject invalid coordinates', () => {
        expect(() => sosSMSService.encodeSOSPayload(95.0, 73.4062)).toThrow(/Invalid coordinate boundaries/);
        expect(() => sosSMSService.encodeSOSPayload(18.7546, 185.0)).toThrow(/Invalid coordinate boundaries/);
      });
    });

    describe('parseSOSPayload', () => {
      it('should parse standard pipe-delimited SOS payload string', () => {
        const raw = 'SOS|LAT:18.754600|LNG:73.406200|BAT:23|UID:usr_tourist_01';
        const parsed = sosSMSService.parseSOSPayload(raw);

        expect(parsed.type).toBe('SOS');
        expect(parsed.lat).toBeCloseTo(18.7546, 4);
        expect(parsed.lng).toBeCloseTo(73.4062, 4);
        expect(parsed.battery).toBe(23);
        expect(parsed.userId).toBe('usr_tourist_01');
      });

      it('should tolerate lowercase and extra whitespace in payload', () => {
        const raw = '  sos | lat: 18.7546 | lng: 73.4062 | bat: 85 | uid: usr_02  ';
        const parsed = sosSMSService.parseSOSPayload(raw);

        expect(parsed.type).toBe('SOS');
        expect(parsed.lat).toBeCloseTo(18.7546, 4);
        expect(parsed.lng).toBeCloseTo(73.4062, 4);
        expect(parsed.battery).toBe(85);
        expect(parsed.userId).toBe('usr_02');
      });

      it('should parse shorthand U: key for userId', () => {
        const raw = 'SOS|LAT:18.75|LNG:73.40|U:shivam';
        const parsed = sosSMSService.parseSOSPayload(raw);
        expect(parsed.userId).toBe('shivam');
      });

      it('should reject empty or non-string payload', () => {
        expect(() => sosSMSService.parseSOSPayload('')).toThrow(/must be a non-empty string/);
        expect(() => sosSMSService.parseSOSPayload(null as any)).toThrow(/must be a non-empty string/);
      });

      it('should reject payload missing SOS prefix', () => {
        expect(() => sosSMSService.parseSOSPayload('HELP|LAT:18.75|LNG:73.40')).toThrow(/Invalid SMS payload format/);
      });

      it('should reject payload missing coordinates', () => {
        expect(() => sosSMSService.parseSOSPayload('SOS|BAT:50|UID:usr_01')).toThrow(/missing valid LAT and LNG/);
      });

      it('should reject coordinates outside bounds', () => {
        expect(() => sosSMSService.parseSOSPayload('SOS|LAT:95.0|LNG:73.40')).toThrow(/Latitude in SMS payload must be between -90 and 90/);
        expect(() => sosSMSService.parseSOSPayload('SOS|LAT:18.75|LNG:185.0')).toThrow(/Longitude in SMS payload must be between -180 and 180/);
      });

      it('should reject battery outside [0, 100]', () => {
        expect(() => sosSMSService.parseSOSPayload('SOS|LAT:18.75|LNG:73.40|BAT:150')).toThrow(/Battery in SMS payload must be between 0 and 100/);
      });
    });

    describe('sendSOSviaSMS', () => {
      it('should return simulated SMS dispatch envelope in simulation/dev mode', async () => {
        const result = await sosSMSService.sendSOSviaSMS(
          '+919876543210',
          'sos_event_01',
          18.7546,
          73.4062,
          50
        );

        expect(result.success).toBe(true);
        expect(result.mode).toBe('SIMULATED');
        expect(result.recipientPhone).toBe('+919876543210');
        expect(result.messageId).toMatch(/^sim_sms_/);
      });

      it('should reject invalid recipient phone numbers', async () => {
        await expect(
          sosSMSService.sendSOSviaSMS('123', 'sos_01', 18.75, 73.40)
        ).rejects.toThrow(/Invalid recipient phone number/);
      });
    });
  });
});
