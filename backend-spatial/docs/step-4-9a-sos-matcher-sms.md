# 📄 Technical Specification: SOS Proximity Matcher & SMS Gateway

> **Step ID**: `4.9a`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-9a-sos-matcher-sms`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.9a initiates the SOS Emergency Dispatch architecture for `backend-spatial`. When an emergency occurs, seconds matter: the system must instantly identify and rank on-duty Yaatri Mitra volunteers within a 5km radius (`sos.matcher.ts`) and support resilient, offline-first emergency telemetry encoding/dispatch via SMS gateway (`sos.sms.ts`).

This step implements the TypeScript data contracts for the SOS subsystem, the volunteer proximity matcher engine, the offline SMS payload encoder/decoder (`SOS|LAT:...|LNG:...|BAT:...|UID:...`), and the multi-mode SMS dispatcher (live Twilio vs simulated mode).

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/modules/volunteer/volunteer.service.ts` (`findNearbyVolunteers` with PostGIS `ST_DWithin`).
  - `backend-spatial/src/modules/volunteer/volunteer.types.ts` (`NearbyVolunteerResult`).
  - `backend-spatial/src/config/env.ts` (Environment variables for `SIMULATION_MODE`, `TWILIO_*`).
  - `backend-spatial/src/utils/response.ts` (`AppError`).
- **Blocked by**: None (Data model and spatial volunteer queries are ready).
- **New Packages / Libraries**: None (`uuid` is already installed).

---

## 3. 🧠 Sequential Thinking Strategy
> *Outlines the core reasoning hypotheses, spatial edge cases, and algorithmic invariants to validate during implementation.*

- **Core Reasoning Hypotheses**:
  - **Telemetry Compression for SMS**: Standard SMS messages are constrained to 160 GSM-7 characters. The offline emergency payload format (`SOS|LAT:18.7546|LNG:73.4062|BAT:23|UID:usr_01`) must consume $\le 60$ characters, leaving ample headroom for regional telecom routing headers.
  - **Resilient Fallback Parsing**: SMS messages may arrive with whitespace, line breaks, or lowercase prefixes from various telecom SMS centers. The parser must accept case-insensitive inputs and tolerate optional parameters (e.g. missing battery or altitude).
  - **Zero Volunteer Handling**: If an SOS is triggered in a remote sector with 0 volunteers in 5km, the matcher must return an empty list without throwing errors, enabling the parent SOS service to immediately escalate to admin and local authorities.
- **Spatial / Algorithmic Edge Cases**:
  - **Extreme Coordinates**: GPS coordinates in SMS payloads must be validated against latitude $\in [-90, 90]$ and longitude $\in [-180, 180]$.
  - **ETA Computation**: Volunteer response ETA formula $\text{ETA} = \text{round}(\text{distance} / 4.0\text{ m/s}) + 60\text{s}$ (incorporating foot-sprint speed and 60-second reaction/mobilization time).

---

## 4. Data Contracts & Schema Specifications

### 4.1 Data Models & Types (`src/modules/sos/sos.types.ts`)

```typescript
import { SOSStatus } from '@prisma/client';
import { NearbyVolunteerResult } from '../volunteer/volunteer.types';

export type SOSResponseStatus = 'ALERTED' | 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'DECLINED';

export interface SOSEntity {
  id: string;
  triggeredBy: string;
  lat: number;
  lng: number;
  altitude?: number | null;
  battery?: number | null;
  audioUrl?: string | null;
  status: SOSStatus;
  dangerScore?: number | null;
  resolvedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerSOSInput {
  userId: string;
  lat: number;
  lng: number;
  altitude?: number;
  battery?: number;
  audioUrl?: string;
}

export interface SOSMatchResult {
  volunteerCount: number;
  volunteers: NearbyVolunteerResult[];
  nearestVolunteer?: NearbyVolunteerResult;
  nearestEtaSeconds?: number;
}

export interface ParsedSMSPayload {
  type: 'SOS';
  lat: number;
  lng: number;
  battery?: number;
  userId?: string;
}

export interface SMSDispatchResult {
  success: boolean;
  messageId: string;
  recipientPhone: string;
  mode: 'SIMULATED' | 'TWILIO';
}
```

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Types & Contracts (`src/modules/sos/sos.types.ts`)**
   - [ ] Define `SOSEntity`, `TriggerSOSInput`, `SOSMatchResult`, `ParsedSMSPayload`, and `SMSDispatchResult`.

2. **Phase B: Volunteer Proximity Matcher (`src/modules/sos/sos.matcher.ts`)**
   - [ ] Implement `SOSMatcher.matchVolunteers(lat, lng, radiusMeters = 5000, limit = 10)` calling `volunteerService.findNearbyVolunteers`.
   - [ ] Compute summary metrics (`nearestVolunteer`, `nearestEtaSeconds`, `volunteerCount`).

3. **Phase C: SMS Fallback Gateway (`src/modules/sos/sos.sms.ts`)**
   - [ ] Implement `encodeSOSPayload(lat, lng, battery, userId)`.
   - [ ] Implement `parseSOSPayload(rawText)` with strict coordinate validation and error handling.
   - [ ] Implement `sendSOSviaSMS(recipientPhone, sosId, lat, lng, battery)` supporting simulation mode and Twilio dispatch.

4. **Phase D: Unit Tests (`tests/sos.matcher-sms.test.ts`)**
   - [ ] Test volunteer matching with nearest ETA calculations and empty sector handling.
   - [ ] Test SMS payload encoding, parsing, edge-case handling, and SMS dispatch.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/sos.matcher-sms.test.ts
```

### Acceptance Checklist
- [ ] Matcher queries volunteers within 5km and sorts by ascending distance/ETA.
- [ ] SMS payload encoder/decoder completes roundtrip conversions without loss of coordinate precision.
- [ ] Malformed SMS strings are rejected with descriptive `AppError`.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
