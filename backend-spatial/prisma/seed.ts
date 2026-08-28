// ==============================================================================
// SAFE YATRA — DATABASE SEED SCRIPT & SPATIAL FIXTURES
// Master Seed Reference: GEMINI.md Section 8 & implementation_plan.md Phase 2.3
// ==============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export interface SeedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordPlain: string;
  passwordHash: string;
  role: 'TOURIST' | 'YAATRI_MITRA' | 'ADMIN';
  profileImageUrl?: string;
  volunteerProfile?: {
    aadharNumber: string;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
    isOnDuty: boolean;
    totalResponses: number;
    avgResponseTime: number;
    rating: number;
  };
}

export interface SeedZone {
  id: string;
  name: string;
  description: string;
  dangerScore: number;
  dangerTier: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  justification: string;
  isManualOverride: boolean;
  // WKT Polygon format: SRID=4326;POLYGON((lng lat, ...))
  wktBoundary: string;
  centerCoordinates: { lat: number; lng: number };
}

export interface SeedGeofence {
  id: string;
  zoneId?: string;
  name: string;
  type: 'AUTO_DANGER' | 'MANUAL_NOENTRY' | 'ADMIN_OVERRIDE';
  severity: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  message: string;
  isActive: boolean;
  wktBoundary: string;
}

export interface SeedIncident {
  id: string;
  zoneId?: string;
  type: 'DROWNING' | 'STAMPEDE' | 'LANDSLIDE' | 'FLOOD' | 'FALL' | 'OTHER';
  description: string;
  severity: 'MINOR' | 'MAJOR' | 'FATAL';
  casualties: number;
  occurredAt: Date;
  source: string;
  wktCoordinates: string;
  coordinates: { lat: number; lng: number };
}

export interface SeedBroadcastAlert {
  id: string;
  title: string;
  message: string;
  severity: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  createdBy: string;
  isActive: boolean;
  expiresAt: Date | null;
  wktTargetArea: string;
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function formatWktPoint(lng: number, lat: number): string {
  return `POINT(${lng.toFixed(4)} ${lat.toFixed(4)})`;
}

export function formatWktPolygon(coordinates: [number, number][]): string {
  const coordString = coordinates.map(([lng, lat]) => `${lng.toFixed(4)} ${lat.toFixed(4)}`).join(', ');
  return `POLYGON((${coordString}))`;
}

export function isPolygonClosed(coordinates: [number, number][]): boolean {
  if (coordinates.length < 4) return false;
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

// ─── SEED FIXTURES: LONAVALA PILGRIMAGE & TOURISM CORRIDOR ─────────────────

const defaultPassword = 'Password123!';
const standardPasswordHash = hashPassword(defaultPassword);

export const seedUsers: SeedUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Aarav Sharma',
    email: 'tourist@safeyatra.in',
    phone: '+919876543210',
    passwordPlain: defaultPassword,
    passwordHash: standardPasswordHash,
    role: 'TOURIST',
    profileImageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Priya Deshmukh',
    email: 'mitra@safeyatra.in',
    phone: '+919876543211',
    passwordPlain: defaultPassword,
    passwordHash: standardPasswordHash,
    role: 'YAATRI_MITRA',
    profileImageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    volunteerProfile: {
      aadharNumber: 'XXXX-XXXX-8912',
      verificationStatus: 'VERIFIED',
      isOnDuty: true,
      totalResponses: 14,
      avgResponseTime: 240, // 4 minutes
      rating: 4.9,
    },
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Vikram Rathore',
    email: 'admin@safeyatra.in',
    phone: '+919876543212',
    passwordPlain: defaultPassword,
    passwordHash: standardPasswordHash,
    role: 'ADMIN',
    profileImageUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
  },
];

export const seedZones: SeedZone[] = [
  {
    id: 'zone-lonavala-bhushi-dam-01',
    name: 'Bhushi Dam Waterfall Zone',
    description: 'Popular stepped waterfall site prone to sudden upstream surges during heavy rainfall.',
    dangerScore: 85,
    dangerTier: 'CRITICAL',
    justification: 'High flash flood risk due to 180mm rainfall upstream and active spillway overflow. 4 past drowning incidents.',
    isManualOverride: false,
    centerCoordinates: { lat: 18.735, lng: 73.418 },
    wktBoundary: formatWktPolygon([
      [73.415, 18.732],
      [73.421, 18.732],
      [73.421, 18.738],
      [73.415, 18.738],
      [73.415, 18.732],
    ]),
  },
  {
    id: 'zone-lonavala-tiger-point-02',
    name: 'Tiger Point Cliff Edge',
    description: 'Prominent cliff lookout with a 650m vertical drop, high wind velocity, and steep terrain slope.',
    dangerScore: 68,
    dangerTier: 'SEVERE',
    justification: 'High wind gusts (>45 km/h) and wet slippery rocks near unfenced cliff perimeter.',
    isManualOverride: false,
    centerCoordinates: { lat: 18.721, lng: 73.385 },
    wktBoundary: formatWktPolygon([
      [73.382, 18.718],
      [73.388, 18.718],
      [73.388, 18.724],
      [73.382, 18.724],
      [73.382, 18.718],
    ]),
  },
  {
    id: 'zone-lonavala-karla-caves-03',
    name: 'Karla Caves Steps & Complex',
    description: 'Ancient rock-cut Buddhist shrine complex with steep steps subject to heavy pilgrimage footfall.',
    dangerScore: 42,
    dangerTier: 'MODERATE',
    justification: 'Moderate crowd congestion (>4,500 visitors) on narrow ancient stone staircase.',
    isManualOverride: false,
    centerCoordinates: { lat: 18.782, lng: 73.471 },
    wktBoundary: formatWktPolygon([
      [73.468, 18.779],
      [73.474, 18.779],
      [73.474, 18.785],
      [73.468, 18.785],
      [73.468, 18.779],
    ]),
  },
  {
    id: 'zone-lonavala-rajmachi-trail-04',
    name: 'Rajmachi Fort Trekking Trail',
    description: 'Rugged forest and ridge trail connecting Udhewadi village to Manaranjan and Shrivardhan forts.',
    dangerScore: 35,
    dangerTier: 'MODERATE',
    justification: 'Slippery trail conditions and dense monsoon fog limiting visibility to under 50m.',
    isManualOverride: false,
    centerCoordinates: { lat: 18.825, lng: 73.398 },
    wktBoundary: formatWktPolygon([
      [73.395, 18.822],
      [73.401, 18.822],
      [73.401, 18.828],
      [73.395, 18.828],
      [73.395, 18.822],
    ]),
  },
  {
    id: 'zone-lonavala-khandala-ghat-05',
    name: 'Khandala Ghat Scenic Viewpoint',
    description: 'Protected overlook with safety railings, tourist police outpost, and low topographical hazard.',
    dangerScore: 18,
    dangerTier: 'LOW',
    justification: 'Safe conditions. Clear weather, paved observation area, and active safety personnel.',
    isManualOverride: false,
    centerCoordinates: { lat: 18.756, lng: 73.372 },
    wktBoundary: formatWktPolygon([
      [73.369, 18.753],
      [73.375, 18.753],
      [73.375, 18.759],
      [73.369, 18.759],
      [73.369, 18.753],
    ]),
  },
];

export const seedGeofences: SeedGeofence[] = [
  {
    id: 'geo-bhushi-spillway-no-entry',
    zoneId: 'zone-lonavala-bhushi-dam-01',
    name: 'Bhushi Spillway No-Entry Zone',
    type: 'AUTO_DANGER',
    severity: 'CRITICAL',
    message: 'DANGER: Water levels exceeding safety threshold. Flash flood risk. Evacuate immediately.',
    isActive: true,
    wktBoundary: formatWktPolygon([
      [73.416, 18.733],
      [73.42, 18.733],
      [73.42, 18.737],
      [73.416, 18.737],
      [73.416, 18.733],
    ]),
  },
  {
    id: 'geo-tiger-point-cliff-barrier',
    zoneId: 'zone-lonavala-tiger-point-02',
    name: 'Tiger Point Cliff Edge Barrier',
    type: 'MANUAL_NOENTRY',
    severity: 'SEVERE',
    message: 'CAUTION: Approaching unfenced 650m sheer cliff drop. Maintain at least 10m distance.',
    isActive: true,
    wktBoundary: formatWktPolygon([
      [73.383, 18.719],
      [73.387, 18.719],
      [73.387, 18.723],
      [73.383, 18.723],
      [73.383, 18.719],
    ]),
  },
  {
    id: 'geo-karla-caves-heritage-buffer',
    zoneId: 'zone-lonavala-karla-caves-03',
    name: 'Karla Caves Entry Buffer',
    type: 'ADMIN_OVERRIDE',
    severity: 'LOW',
    message: 'INFO: Welcome to Karla Caves Heritage Buffer. Please proceed in single file along stone steps.',
    isActive: true,
    wktBoundary: formatWktPolygon([
      [73.469, 73.78],
      [73.473, 73.78],
      [73.473, 73.784],
      [73.469, 73.784],
      [73.469, 73.78],
    ]),
  },
];

// Fix Karla Caves latitude in geofence
seedGeofences[2].wktBoundary = formatWktPolygon([
  [73.469, 18.78],
  [73.473, 18.78],
  [73.473, 18.784],
  [73.469, 18.784],
  [73.469, 18.78],
]);

export const seedIncidents: SeedIncident[] = [
  {
    id: 'inc-001',
    zoneId: 'zone-lonavala-bhushi-dam-01',
    type: 'DROWNING',
    description: 'Two tourists swept away by sudden water surge on Bhushi Dam overflow steps.',
    severity: 'FATAL',
    casualties: 2,
    occurredAt: new Date('2024-07-15T14:30:00Z'),
    source: 'GOVT_REPORT',
    coordinates: { lat: 18.7352, lng: 73.4182 },
    wktCoordinates: formatWktPoint(73.4182, 18.7352),
  },
  {
    id: 'inc-002',
    zoneId: 'zone-lonavala-tiger-point-02',
    type: 'FALL',
    description: 'Tourist slipped on wet mossy rocks near cliff edge while photographing.',
    severity: 'FATAL',
    casualties: 1,
    occurredAt: new Date('2024-08-03T11:15:00Z'),
    source: 'NEWS',
    coordinates: { lat: 18.7214, lng: 73.3853 },
    wktCoordinates: formatWktPoint(73.3853, 18.7214),
  },
  {
    id: 'inc-003',
    zoneId: 'zone-lonavala-khandala-ghat-05',
    type: 'LANDSLIDE',
    description: 'Minor rockfall and mudslide temporarily obstructed Khandala Ghat bypass road.',
    severity: 'MAJOR',
    casualties: 0,
    occurredAt: new Date('2023-09-12T08:00:00Z'),
    source: 'GOVT_REPORT',
    coordinates: { lat: 18.7562, lng: 73.3724 },
    wktCoordinates: formatWktPoint(73.3724, 18.7562),
  },
  {
    id: 'inc-004',
    zoneId: 'zone-lonavala-bhushi-dam-01',
    type: 'FLOOD',
    description: 'Rapid water accumulation stranded 12 visitors on rock outcrop; rescued by local volunteers.',
    severity: 'MAJOR',
    casualties: 0,
    occurredAt: new Date('2023-07-28T16:45:00Z'),
    source: 'USER_REPORT',
    coordinates: { lat: 18.7348, lng: 73.4178 },
    wktCoordinates: formatWktPoint(73.4178, 18.7348),
  },
  {
    id: 'inc-005',
    zoneId: 'zone-lonavala-karla-caves-03',
    type: 'STAMPEDE',
    description: 'Holiday crowd surge on narrow rock staircase caused minor crush injuries.',
    severity: 'MINOR',
    casualties: 4,
    occurredAt: new Date('2024-01-01T17:00:00Z'),
    source: 'GOVT_REPORT',
    coordinates: { lat: 18.7822, lng: 73.4712 },
    wktCoordinates: formatWktPoint(73.4712, 18.7822),
  },
  {
    id: 'inc-006',
    zoneId: 'zone-lonavala-rajmachi-trail-04',
    type: 'OTHER',
    description: 'Solo trekker lost trail orientation in heavy fog near Kondhane caves junction.',
    severity: 'MINOR',
    casualties: 0,
    occurredAt: new Date('2022-08-19T19:30:00Z'),
    source: 'USER_REPORT',
    coordinates: { lat: 18.8253, lng: 73.3979 },
    wktCoordinates: formatWktPoint(73.3979, 18.8253),
  },
  {
    id: 'inc-007',
    zoneId: 'zone-lonavala-bhushi-dam-01',
    type: 'DROWNING',
    description: 'Undercurrent pulled swimmer into deep catchment basin near spillway pool.',
    severity: 'FATAL',
    casualties: 1,
    occurredAt: new Date('2023-06-25T13:20:00Z'),
    source: 'NEWS',
    coordinates: { lat: 18.7355, lng: 73.4185 },
    wktCoordinates: formatWktPoint(73.4185, 18.7355),
  },
  {
    id: 'inc-008',
    zoneId: 'zone-lonavala-tiger-point-02',
    type: 'FALL',
    description: 'Trekker suffered ankle fracture after slipping on steep descent path.',
    severity: 'MINOR',
    casualties: 1,
    occurredAt: new Date('2024-06-30T10:10:00Z'),
    source: 'USER_REPORT',
    coordinates: { lat: 18.7212, lng: 73.3848 },
    wktCoordinates: formatWktPoint(73.3848, 18.7212),
  },
  {
    id: 'inc-009',
    zoneId: 'zone-lonavala-khandala-ghat-05',
    type: 'LANDSLIDE',
    description: 'Boulder detachment damaged vehicle windshield; occupants treated for minor cuts.',
    severity: 'MAJOR',
    casualties: 2,
    occurredAt: new Date('2022-07-14T06:50:00Z'),
    source: 'NEWS',
    coordinates: { lat: 18.7558, lng: 73.3718 },
    wktCoordinates: formatWktPoint(73.3718, 18.7558),
  },
  {
    id: 'inc-010',
    zoneId: 'zone-lonavala-rajmachi-trail-04',
    type: 'OTHER',
    description: 'Trekker experienced severe hypothermia during relentless monsoon downpour.',
    severity: 'MINOR',
    casualties: 1,
    occurredAt: new Date('2024-08-11T15:40:00Z'),
    source: 'USER_REPORT',
    coordinates: { lat: 18.8248, lng: 73.3984 },
    wktCoordinates: formatWktPoint(73.3984, 18.8248),
  },
];

export const seedBroadcastAlerts: SeedBroadcastAlert[] = [
  {
    id: 'alert-monsoon-warning-active',
    title: 'IMD Red Alert: Intense Precipitation Advisory',
    message: 'Heavy to extremely heavy rainfall (>200mm) forecast for Lonavala-Khandala ghats. Avoid water bodies, waterfalls, and steep cliff perimeters.',
    severity: 'CRITICAL',
    createdBy: '33333333-3333-3333-3333-333333333333',
    isActive: true,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24 hours
    wktTargetArea: formatWktPolygon([
      [73.35, 18.7],
      [73.5, 18.7],
      [73.5, 18.85],
      [73.35, 18.85],
      [73.35, 18.7],
    ]),
  },
  {
    id: 'alert-high-wind-advisory-expired',
    title: 'High Wind Velocity Advisory',
    message: 'Gusts exceeding 50 km/h recorded at elevated vantage points. Caution advised near cliff edges.',
    severity: 'MODERATE',
    createdBy: '33333333-3333-3333-3333-333333333333',
    isActive: false,
    expiresAt: new Date('2024-08-01T00:00:00Z'),
    wktTargetArea: formatWktPolygon([
      [73.37, 18.71],
      [73.49, 18.71],
      [73.49, 18.83],
      [73.37, 18.83],
      [73.37, 18.71],
    ]),
  },
];

// ─── DATABASE SEED EXECUTION ────────────────────────────────────────────────

export async function seedDatabase(prisma: PrismaClient): Promise<{
  usersCount: number;
  zonesCount: number;
  geofencesCount: number;
  incidentsCount: number;
  broadcastsCount: number;
}> {
  console.log('🌱 Starting Safe Yatra database seeding...');

  // 1. Clean existing records in reverse dependency order
  await prisma.$executeRawUnsafe(`DELETE FROM "SOSTimeline";`).catch(() => {});
  await prisma.$executeRawUnsafe(`DELETE FROM "SOSResponse";`).catch(() => {});
  await prisma.$executeRawUnsafe(`DELETE FROM "SOSEvent";`).catch(() => {});
  await prisma.$executeRawUnsafe(`DELETE FROM "UserLocation";`).catch(() => {});
  await prisma.$executeRawUnsafe(`DELETE FROM "Incident";`).catch(() => {});
  await prisma.$executeRawUnsafe(`DELETE FROM "Geofence";`).catch(() => {});
  await prisma.$executeRawUnsafe(`DELETE FROM "BroadcastAlert";`).catch(() => {});
  await prisma.$executeRawUnsafe(`DELETE FROM "Zone";`).catch(() => {});
  await prisma.$executeRawUnsafe(`DELETE FROM "VolunteerProfile";`).catch(() => {});
  await prisma.$executeRawUnsafe(`DELETE FROM "User";`).catch(() => {});

  // 2. Insert Users & Volunteer Profiles
  for (const user of seedUsers) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        passwordHash: user.passwordHash,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        isActive: true,
        volunteerProfile: user.volunteerProfile
          ? {
              create: {
                aadharNumber: user.volunteerProfile.aadharNumber,
                verificationStatus: user.volunteerProfile.verificationStatus,
                isOnDuty: user.volunteerProfile.isOnDuty,
                totalResponses: user.volunteerProfile.totalResponses,
                avgResponseTime: user.volunteerProfile.avgResponseTime,
                rating: user.volunteerProfile.rating,
              },
            }
          : undefined,
      },
    });
  }

  // 3. Insert Zones with PostGIS Polygon Geometry
  for (const zone of seedZones) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Zone" ("id", "name", "description", "dangerScore", "dangerTier", "justification", "isManualOverride", "boundary", "updatedAt", "createdAt")
       VALUES ($1, $2, $3, $4, $5::"DangerTier", $6, $7, ST_GeomFromText($8, 4326), NOW(), NOW());`,
      zone.id,
      zone.name,
      zone.description,
      zone.dangerScore,
      zone.dangerTier,
      zone.justification,
      zone.isManualOverride,
      zone.wktBoundary
    );
  }

  // 4. Insert Geofences with PostGIS Polygon Geometry
  for (const geo of seedGeofences) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Geofence" ("id", "zoneId", "name", "type", "isActive", "severity", "message", "boundary", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6::"DangerTier", $7, ST_GeomFromText($8, 4326), NOW());`,
      geo.id,
      geo.zoneId || null,
      geo.name,
      geo.type,
      geo.isActive,
      geo.severity,
      geo.message,
      geo.wktBoundary
    );
  }

  // 5. Insert Incidents with PostGIS Point Geometry
  for (const inc of seedIncidents) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Incident" ("id", "zoneId", "type", "description", "severity", "casualties", "occurredAt", "source", "coordinates", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_GeomFromText($9, 4326), NOW());`,
      inc.id,
      inc.zoneId || null,
      inc.type,
      inc.description,
      inc.severity,
      inc.casualties,
      inc.occurredAt,
      inc.source,
      inc.wktCoordinates
    );
  }

  // 6. Insert Broadcast Alerts with PostGIS Polygon Geometry
  for (const alert of seedBroadcastAlerts) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "BroadcastAlert" ("id", "title", "message", "severity", "createdBy", "isActive", "expiresAt", "targetArea", "createdAt")
       VALUES ($1, $2, $3, $4::"DangerTier", $5, $6, $7, ST_GeomFromText($8, 4326), NOW());`,
      alert.id,
      alert.title,
      alert.message,
      alert.severity,
      alert.createdBy,
      alert.isActive,
      alert.expiresAt,
      alert.wktTargetArea
    );
  }

  console.log(`✅ Seed complete: ${seedUsers.length} users, ${seedZones.length} zones, ${seedGeofences.length} geofences, ${seedIncidents.length} incidents, ${seedBroadcastAlerts.length} broadcast alerts.`);

  return {
    usersCount: seedUsers.length,
    zonesCount: seedZones.length,
    geofencesCount: seedGeofences.length,
    incidentsCount: seedIncidents.length,
    broadcastsCount: seedBroadcastAlerts.length,
  };
}

// ─── DIRECT CLI INVOCATION ──────────────────────────────────────────────────

if (require.main === module || (process.argv && process.argv[1]?.includes('seed.ts'))) {
  const prisma = new PrismaClient();
  seedDatabase(prisma)
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Seeding error:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
