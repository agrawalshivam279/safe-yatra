# 📄 Technical Specification: Database Seed Data Script & PostGIS Spatial Fixtures

> **Step ID**: `2.3`  
> **Target Module**: `backend-spatial` / `data`  
> **Git Feature Branch**: `feat/step-2-3-database-seed-data`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-28  

---

## 1. Executive Summary

Step 2.3 implements the automated database seeding engine (`backend-spatial/prisma/seed.ts`) and spatial test fixtures for Safe Yatra. To ensure the backend, ML risk engine, mobile app, and admin dashboard can be tested immediately against realistic environmental and geospatial conditions, this step populates the Lonavala pilgrimage and trekking corridor (lat: 18.75, lng: 73.40) with:
- **3 Test Users**: One Tourist, one verified & on-duty Yaatri Mitra with a `VolunteerProfile`, and one Admin with pre-hashed bcrypt credentials.
- **5 Geographic Zones**: Lonavala key hotspots (Bhushi Dam, Tiger Point, Karla Caves, Rajmachi Fort, Khandala Ghat) with PostGIS polygon geometries, danger scores (18–85), and dynamic justification metadata.
- **3 Geofence Boundaries**: High-risk polygon perimeters (LOW, SEVERE, CRITICAL) attached to zones.
- **10 Historical Incidents**: Realistically distributed incident records (Drowning, Landslide, Stampede, Fall) with PostGIS Point coordinates.
- **2 Broadcast Alerts**: One active sector-wide monsoon advisory and one expired alert.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/prisma/schema.prisma` (defined in Step 2.2).
  - `@prisma/client`, `prisma`, `bcryptjs`, `@types/bcryptjs`.
- **Blocked by**: None.
- **New Packages / Libraries**: None (all dependencies present in `package.json`).

---

## 3. 🧠 Sequential Thinking Strategy
> *Spatial & Cryptographic Seed Invariants*

- **Complexity Tier**: High (PostGIS WKT Polygon Geometries, Point-in-Polygon Coordinates, Idempotent Raw SQL Execution, Bcrypt Salt Generation).
- **Sequential Thinking MCP**: `Recommended`
  - **PostGIS Coordinate Ordering Invariant**: WKT string syntax strictly requires longitude first, then latitude: `POINT(lng lat)` and `POLYGON((lng1 lat1, lng2 lat2, lng3 lat3, lng4 lat4, lng1 lat1))`. Polygons must be closed (first coordinate equals last coordinate).
  - **Prisma Unsupported Column Insertion**: Because Prisma maps PostGIS types as `Unsupported("geometry(...)")`, spatial entities must be inserted via parameterized raw SQL (`prisma.$executeRawUnsafe` or `$executeRaw`) using `ST_GeomFromText(..., 4326)`.
  - **Idempotent Seed Execution**: Running `npx prisma db seed` repeatedly must safely clean or upsert records without crashing on unique constraints (`email`, `phone`, `userId`).
  - **Password Hashing Pre-computation**: Seed users will use standard bcrypt hashes (e.g. `Password123!`) so developers and testers can immediately log in across all interfaces.

---

## 4. Data Contracts & Seed Fixtures

### 4.1 Test User Accounts

| Role | Name | Email | Phone | Password (Plain) | Profile Details |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TOURIST` | Aarav Sharma | `tourist@safeyatra.in` | `+919876543210` | `Password123!` | Active tourist account |
| `YAATRI_MITRA` | Priya Deshmukh | `mitra@safeyatra.in` | `+919876543211` | `Password123!` | Verified, On-Duty, Rating: 4.9, 14 responses |
| `ADMIN` | Vikram Rathore | `admin@safeyatra.in` | `+919876543212` | `Password123!` | Command Center Admin |

### 4.2 Seed Zones (Lonavala Region)

| Zone Name | Tier | Score | Coordinates Center | Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Bhushi Dam Waterfall** | `CRITICAL` | 85 | 18.7350° N, 73.4180° E | High flash flood risk, overflow surge warning, 4 historical drowning incidents. |
| **Tiger Point Cliff Edge** | `SEVERE` | 68 | 18.7210° N, 73.3850° E | High-altitude sheer drop (650m), gusty crosswinds >45 km/h, slippery edge. |
| **Karla Caves Steps** | `MODERATE` | 42 | 18.7820° N, 73.4710° E | High weekend footfall congestion (>5,000 visitors), narrow rock staircase. |
| **Rajmachi Fort Trail** | `MODERATE` | 35 | 18.8250° N, 73.3980° E | Remote trekking terrain, dense fog visibility <50m during monsoon. |
| **Khandala Ghat Vista** | `LOW` | 18 | 18.7560° N, 73.3720° E | Well-paved observation deck with secure guard rails and tourist police post. |

### 4.3 Seed Geofences

| Geofence Name | Zone | Severity | Type | Action / Message |
| :--- | :--- | :--- | :--- | :--- |
| **Bhushi Spillway No-Entry Zone** | Bhushi Dam | `CRITICAL` | `AUTO_DANGER` | *DANGER: Water levels exceeding danger mark. Turn back immediately.* |
| **Tiger Point Edge Barrier** | Tiger Point | `SEVERE` | `MANUAL_NOENTRY` | *CAUTION: Approaching unfenced cliff perimeter. Maintain 10m distance.* |
| **Karla Caves Entry Buffer** | Karla Caves | `LOW` | `ADMIN_OVERRIDE` | *INFO: Entering Karla Caves cultural heritage buffer zone.* |

### 4.4 Historical Incidents (10 Records)

1. `2024-07-15`: Bhushi Dam — Drowning (`FATAL`, 2 casualties)
2. `2024-08-03`: Tiger Point — Fall from height (`FATAL`, 1 casualty)
3. `2023-09-12`: Khandala Ghat — Landslide (`MAJOR`, 0 casualties, road blockage)
4. `2023-07-28`: Bhushi Dam — Water current sweep (`MAJOR`, 0 casualties, rescue completed)
5. `2024-01-01`: Karla Caves — Stampede / Crowd Surge (`MINOR`, 4 injured)
6. `2022-08-19`: Rajmachi Trail — Lost Trekker (`MINOR`, 0 casualties, located after 8h)
7. `2023-06-25`: Bhushi Dam — Flash flood near falls (`FATAL`, 1 casualty)
8. `2024-06-30`: Tiger Point — Slip and fracture (`MINOR`, 1 injured)
9. `2022-07-14`: Khandala Ghat — Rockfall (`MAJOR`, 2 injured)
10. `2024-08-11`: Rajmachi Trail — Hypothermia / Dehydration (`MINOR`, 1 rescued)

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Author Seed Fixtures and Logic in `prisma/seed.ts`**
   - [ ] Import `@prisma/client` and `bcryptjs`.
   - [ ] Define helper functions to execute spatial WKT inserts (`ST_GeomFromText('POLYGON(...)', 4326)` and `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`).
   - [ ] Implement clean teardown / reset logic (delete existing test entities in foreign key dependency order).
   - [ ] Insert Users, VolunteerProfile, Zones, Geofences, Incidents, and BroadcastAlerts.
   - [ ] Log summary table of seeded entities upon completion.

2. **Phase B: Author Unit / Fixture Integrity Test Suite in `tests/seed.test.ts`**
   - [ ] Validate coordinate formatting (WKT syntax, SRID 4326, valid coordinate ranges for Lonavala).
   - [ ] Validate polygon closure (first point equals last point).
   - [ ] Validate bcrypt password hash matching for test credentials.

3. **Phase C: Verify Execution**
   - [ ] Run `npm test -- tests/seed.test.ts` to ensure all spatial fixtures and password hashes are valid.

---

## 6. Edge Cases & Failure Recovery

- **PostGIS Extension / DB Unavailable during CI**: Seed fixtures must be structured as exported pure data objects so that unit tests can validate geometry representations, WKT strings, and coordinate ordering without requiring a live Postgres instance.
- **Polygon Vertex Closure**: PostGIS requires that the first and last coordinate pair of a polygon ring match exactly; seed fixture generator must enforce closing points.
- **Bcrypt Hash Performance**: Pre-hashing or using standard 10 salt rounds to keep seed execution time under 1 second.

---

## 7. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/seed.test.ts
```

### Acceptance Checklist
- [ ] `backend-spatial/prisma/seed.ts` created with all 3 Users, 1 VolunteerProfile, 5 Zones, 3 Geofences, 10 Incidents, and 2 BroadcastAlerts.
- [ ] PostGIS WKT geometries are valid SRID 4326 polygons and points.
- [ ] `tests/seed.test.ts` passes with 100% test coverage on seed fixtures and spatial invariants.
