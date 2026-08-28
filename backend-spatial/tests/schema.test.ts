import { PrismaClient, UserRole, VerificationStatus, DangerTier, SOSStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

describe('Prisma PostGIS Schema & Model Verification (Step 2.2)', () => {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

  test('schema.prisma file exists and has postgis extension enabled', () => {
    expect(fs.existsSync(schemaPath)).toBe(true);
    const content = fs.readFileSync(schemaPath, 'utf8');
    expect(content).toContain('extensions = [postgis]');
    expect(content).toContain('previewFeatures = ["postgresqlExtensions"]');
  });

  test('Exports all required User and Rescuer Enums', () => {
    expect(UserRole.TOURIST).toBe('TOURIST');
    expect(UserRole.YAATRI_MITRA).toBe('YAATRI_MITRA');
    expect(UserRole.ADMIN).toBe('ADMIN');

    expect(VerificationStatus.PENDING).toBe('PENDING');
    expect(VerificationStatus.VERIFIED).toBe('VERIFIED');
    expect(VerificationStatus.REJECTED).toBe('REJECTED');
  });

  test('Exports all required Hazard and SOS Enums', () => {
    expect(DangerTier.LOW).toBe('LOW');
    expect(DangerTier.MODERATE).toBe('MODERATE');
    expect(DangerTier.SEVERE).toBe('SEVERE');
    expect(DangerTier.CRITICAL).toBe('CRITICAL');

    expect(SOSStatus.TRIGGERED).toBe('TRIGGERED');
    expect(SOSStatus.VOLUNTEER_ACCEPTED).toBe('VOLUNTEER_ACCEPTED');
    expect(SOSStatus.RESOLVED).toBe('RESOLVED');
  });

  test('Prisma schema specifies GiST spatial indexes for geometry columns', () => {
    const content = fs.readFileSync(schemaPath, 'utf8');
    expect(content).toContain('@@index([coordinates], type: Gist)');
    expect(content).toContain('@@index([boundary], type: Gist)');
    expect(content).toContain('@@index([targetArea], type: Gist)');
  });

  test('Prisma schema declares all 10 core entity models', () => {
    const content = fs.readFileSync(schemaPath, 'utf8');
    const expectedModels = [
      'model User',
      'model VolunteerProfile',
      'model UserLocation',
      'model Zone',
      'model Geofence',
      'model SOSEvent',
      'model SOSResponse',
      'model SOSTimeline',
      'model Incident',
      'model BroadcastAlert',
    ];
    expectedModels.forEach((modelDecl) => {
      expect(content).toContain(modelDecl);
    });
  });
});
