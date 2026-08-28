# 📄 Technical Specification: User Profile Service & Volunteer Duty/Location Management

> **Step ID**: `4.4a`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-4a-user-volunteer-service`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.4a implements `UserService` and `VolunteerService` in `backend-spatial`. It provides user profile CRUD operations, volunteer duty status toggling, ephemeral GPS location tracking into `UserLocation`, and mission-critical PostGIS `ST_DWithin` spatial queries for real-time proximity-based volunteer discovery.

This spatial query engine serves as the foundational dependency for the **SOS Emergency Dispatch Pipeline** (`sos.matcher.ts`) and the **Yaatri Mitra Volunteer Network** per `GEMINI.md` Section 5, 8, and 11.

---

## 2. Dependencies & Prerequisites

- **Depends on**: 
  - Step 4.1: Configuration singletons (`src/config/database.ts` with Prisma Client & PostGIS).
  - Step 4.2: Standard response helpers (`src/utils/response.ts`).
  - Step 4.3a: Auth types & service (`src/modules/auth/auth.types.ts`).
  - Phase 2: PostGIS database schema (`User`, `VolunteerProfile`, `UserLocation` with GiST indexes).
- **Blocked by**: None.
- **New Packages / Libraries**: None (`uuid` is already present).

---

## 3. 🧠 Sequential Thinking Strategy

- **Core Reasoning Hypotheses**:
  1. *Coordinate Ordering Standard*: Client coordinates arrive as `{ lat, lng }` (latitude $[-90, 90]$, longitude $[-180, 180]$). In PostGIS SQL, points must strictly be constructed as `ST_SetSRID(ST_MakePoint(lng, lat), 4326)` ($X = \text{lng}$, $Y = \text{lat}$).
  2. *Metric Distance Casting*: PostGIS geometry calculation on SRID 4326 evaluates distances in angular degrees. To evaluate radius and distances in SI **meters**, geometry columns must be cast to `::geography` (`ST_DWithin(ul.coordinates::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radiusMeters)`).
  3. *Latest Position Deduplication*: When multiple GPS pings exist for a volunteer in `UserLocation`, `findNearbyVolunteers` must evaluate only the volunteer's most recent position (`DISTINCT ON (ul."userId") ORDER BY ul."userId", ul.timestamp DESC`).
  4. *SQL Injection Immunity*: All raw PostGIS spatial queries must utilize Prisma tagged template literals (`prisma.$queryRaw` and `prisma.$executeRaw`) to ensure 100% parameterization.

---

## 4. 🗄️ Database & Migration Safety Checklist

- [x] **GiST Spatial Index Preservation**: Queries utilize the existing GiST spatial index on `UserLocation.coordinates` (`@@index([coordinates], type: Gist)`).
- [x] **Zero-Downtime Safe**: No direct database schema modifications or migrations triggered.
- [x] **Coordinate SRID 4326**: Stored strictly as `[lng, lat]` points with SRID 4326.

---

## 5. Data Contracts & Schema Specifications

### 5.1 Volunteer Types (`src/modules/volunteer/volunteer.types.ts`)

```typescript
import { UserRole, VerificationStatus, VolunteerProfile } from '@prisma/client';

export interface LocationPingInput {
  userId: string;
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  battery?: number;
}

export interface NearbyVolunteerResult {
  userId: string;
  name: string;
  phone: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  isOnDuty: boolean;
  rating: number | null;
  totalResponses: number;
  location: {
    lat: number;
    lng: number;
    altitude: number | null;
    battery: number | null;
    lastPing: Date;
  };
  distanceMeters: number;
  estimatedEtaSeconds: number;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  profileImageUrl?: string;
}
```

### 5.2 User Service Interface (`src/modules/user/user.service.ts`)

```typescript
export class UserService {
  async getUserById(userId: string): Promise<UserPublicProfile>;
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserPublicProfile>;
  async deleteAccount(userId: string): Promise<void>;
}
```

### 5.3 Volunteer Service Interface (`src/modules/volunteer/volunteer.service.ts`)

```typescript
export class VolunteerService {
  async registerVolunteer(userId: string, aadharNumber?: string): Promise<VolunteerProfile>;
  async toggleDutyStatus(userId: string, isOnDuty?: boolean): Promise<VolunteerProfile>;
  async recordLocation(input: LocationPingInput): Promise<{ id: string; timestamp: Date }>;
  async findNearbyVolunteers(
    lat: number,
    lng: number,
    radiusMeters?: number,
    limit?: number
  ): Promise<NearbyVolunteerResult[]>;
}
```

---

## 6. Step-by-Step Implementation Sequence

1. **Phase A: Volunteer Types & Data Structures**
   - [ ] Implement `src/modules/volunteer/volunteer.types.ts` defining location pings, proximity results, and ETA structures.
2. **Phase B: User Profile Service**
   - [ ] Implement `src/modules/user/user.service.ts` with profile retrieval, updating, and account deactivation.
3. **Phase C: Volunteer Spatial Service**
   - [ ] Implement `src/modules/volunteer/volunteer.service.ts` with duty toggling, parameterized `ST_SetSRID(ST_MakePoint)` location insertion, and `ST_DWithin(::geography)` proximity matching.
4. **Phase D: Comprehensive Unit Testing**
   - [ ] Author `tests/user-volunteer.service.test.ts` testing profile updates, duty toggles, location recording, distance calculation logic, and nearby volunteer ranking.

---

## 7. Edge Cases & Failure Recovery

- **Zero Volunteers in Range**: Returns empty array `[]` rather than throwing errors.
- **Stale Locations**: Volunteer locations older than 6 hours can be filtered or flagged in ETA calculation.
- **Coordinates Out of Range**: Validates latitude $[-90, 90]$ and longitude $[-180, 180]$ before issuing PostGIS queries.
- **Non-Volunteer Toggling Duty**: Throws 404 `VOLUNTEER_PROFILE_NOT_FOUND` if a tourist without volunteer record attempts duty toggle.

---

## 8. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial
npm test -- tests/user-volunteer.service.test.ts
```

### Acceptance Checklist
- [ ] `UserService.updateProfile` updates name/phone and sanitizes output.
- [ ] `VolunteerService.toggleDutyStatus` correctly flips or sets `isOnDuty`.
- [ ] `VolunteerService.recordLocation` inserts Point geometry into `UserLocation` using `[lng, lat]` order.
- [ ] `VolunteerService.findNearbyVolunteers` returns sorted list of on-duty verified volunteers with distance in meters and ETA.
- [ ] All unit tests in `tests/user-volunteer.service.test.ts` pass with 100% assertion coverage.
