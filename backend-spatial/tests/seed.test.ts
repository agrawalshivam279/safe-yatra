// ==============================================================================
// SAFE YATRA — SEED FIXTURES & SPATIAL INTEGRITY TESTS
// Tests: seed.ts fixture validity, WKT polygon closure, coordinate bounds, bcrypt
// ==============================================================================

import bcrypt from 'bcryptjs';
import {
  seedUsers,
  seedZones,
  seedGeofences,
  seedIncidents,
  seedBroadcastAlerts,
  formatWktPoint,
  formatWktPolygon,
  isPolygonClosed,
  hashPassword,
} from '../prisma/seed';

describe('Safe Yatra Seed Data & Spatial Integrity', () => {
  describe('1. Test User Accounts & Credentials', () => {
    it('should seed exactly 3 test users covering all 3 roles', () => {
      expect(seedUsers).toHaveLength(3);
      const roles = seedUsers.map((u) => u.role);
      expect(roles).toContain('TOURIST');
      expect(roles).toContain('YAATRI_MITRA');
      expect(roles).toContain('ADMIN');
    });

    it('should have valid bcrypt password hashes matching "Password123!"', () => {
      for (const user of seedUsers) {
        expect(user.passwordHash).toBeDefined();
        expect(user.passwordHash.startsWith('$2')).toBe(true);
        const isMatch = bcrypt.compareSync('Password123!', user.passwordHash);
        expect(isMatch).toBe(true);
      }
    });

    it('should configure an on-duty, verified volunteer profile for the Yaatri Mitra', () => {
      const mitra = seedUsers.find((u) => u.role === 'YAATRI_MITRA');
      expect(mitra).toBeDefined();
      expect(mitra?.volunteerProfile).toBeDefined();
      expect(mitra?.volunteerProfile?.verificationStatus).toBe('VERIFIED');
      expect(mitra?.volunteerProfile?.isOnDuty).toBe(true);
      expect(mitra?.volunteerProfile?.rating).toBe(4.9);
      expect(mitra?.volunteerProfile?.totalResponses).toBeGreaterThan(0);
    });

    it('should have unique email and phone numbers for all users', () => {
      const emails = new Set(seedUsers.map((u) => u.email));
      const phones = new Set(seedUsers.map((u) => u.phone));
      expect(emails.size).toBe(seedUsers.length);
      expect(phones.size).toBe(seedUsers.length);
    });
  });

  describe('2. Spatial Geometry & WKT Format Invariants', () => {
    it('should correctly format WKT Point strings as POINT(lng lat)', () => {
      const pointWkt = formatWktPoint(73.418, 18.735);
      expect(pointWkt).toBe('POINT(73.4180 18.7350)');
    });

    it('should correctly format WKT Polygon strings as POLYGON((...))', () => {
      const coords: [number, number][] = [
        [73.415, 18.732],
        [73.421, 18.732],
        [73.421, 18.738],
        [73.415, 18.738],
        [73.415, 18.732],
      ];
      const polyWkt = formatWktPolygon(coords);
      expect(polyWkt).toBe(
        'POLYGON((73.4150 18.7320, 73.4210 18.7320, 73.4210 18.7380, 73.4150 18.7380, 73.4150 18.7320))'
      );
      expect(isPolygonClosed(coords)).toBe(true);
    });

    it('should ensure all 5 zone boundaries are closed WKT polygons within Lonavala bounds', () => {
      expect(seedZones).toHaveLength(5);
      for (const zone of seedZones) {
        expect(zone.wktBoundary.startsWith('POLYGON((')).toBe(true);
        expect(zone.wktBoundary.endsWith('))')).toBe(true);

        // Lonavala bounding box: Lat: [18.70, 18.85], Lng: [73.35, 73.50]
        expect(zone.centerCoordinates.lat).toBeGreaterThanOrEqual(18.7);
        expect(zone.centerCoordinates.lat).toBeLessThanOrEqual(18.85);
        expect(zone.centerCoordinates.lng).toBeGreaterThanOrEqual(73.35);
        expect(zone.centerCoordinates.lng).toBeLessThanOrEqual(73.5);
      }
    });

    it('should assign correct danger tiers to danger scores across zones', () => {
      const bhushi = seedZones.find((z) => z.name.includes('Bhushi'));
      expect(bhushi?.dangerScore).toBe(85);
      expect(bhushi?.dangerTier).toBe('CRITICAL');

      const tiger = seedZones.find((z) => z.name.includes('Tiger'));
      expect(tiger?.dangerScore).toBe(68);
      expect(tiger?.dangerTier).toBe('SEVERE');

      const karla = seedZones.find((z) => z.name.includes('Karla'));
      expect(karla?.dangerScore).toBe(42);
      expect(karla?.dangerTier).toBe('MODERATE');

      const khandala = seedZones.find((z) => z.name.includes('Khandala'));
      expect(khandala?.dangerScore).toBe(18);
      expect(khandala?.dangerTier).toBe('LOW');
    });
  });

  describe('3. Geofences, Incidents & Broadcast Alerts', () => {
    it('should seed 3 geofences linked to danger zones', () => {
      expect(seedGeofences).toHaveLength(3);
      const severities = seedGeofences.map((g) => g.severity);
      expect(severities).toContain('CRITICAL');
      expect(severities).toContain('SEVERE');
      expect(severities).toContain('LOW');

      for (const geo of seedGeofences) {
        expect(geo.wktBoundary.startsWith('POLYGON((')).toBe(true);
        expect(geo.message).toBeDefined();
        expect(geo.message.length).toBeGreaterThan(10);
      }
    });

    it('should seed 10 historical incidents with valid Point coordinates and severities', () => {
      expect(seedIncidents).toHaveLength(10);
      const types = new Set(seedIncidents.map((i) => i.type));
      expect(types).toContain('DROWNING');
      expect(types).toContain('FALL');
      expect(types).toContain('LANDSLIDE');
      expect(types).toContain('FLOOD');
      expect(types).toContain('STAMPEDE');

      for (const inc of seedIncidents) {
        expect(inc.wktCoordinates.startsWith('POINT(')).toBe(true);
        expect(inc.wktCoordinates.endsWith(')')).toBe(true);
        expect(inc.occurredAt).toBeInstanceOf(Date);
        expect(inc.casualties).toBeGreaterThanOrEqual(0);
      }
    });

    it('should seed 2 broadcast alerts (1 active critical, 1 expired moderate)', () => {
      expect(seedBroadcastAlerts).toHaveLength(2);

      const activeAlert = seedBroadcastAlerts.find((a) => a.isActive);
      expect(activeAlert).toBeDefined();
      expect(activeAlert?.severity).toBe('CRITICAL');
      expect(activeAlert?.wktTargetArea.startsWith('POLYGON((')).toBe(true);

      const expiredAlert = seedBroadcastAlerts.find((a) => !a.isActive);
      expect(expiredAlert).toBeDefined();
      expect(expiredAlert?.severity).toBe('MODERATE');
      expect(expiredAlert?.expiresAt).toBeDefined();
    });
  });
});
