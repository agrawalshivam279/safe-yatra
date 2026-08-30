# 📄 Technical Specification: Offline SMS Fallback & Inbound Telemetry Ingestion E2E Suite

> **Step ID**: `7.3`  
> **Target Module**: `backend-spatial` & `mobile-app` (Cross-Module)  
> **Git Feature Branch**: `feat/step-7-3-offline-sms-fallback`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-30  

---

## 1. Executive Summary

Step 7.3 validates the **OFFLINE-FIRST** safety guarantee of Safe Yatra: when internet connectivity or WebSocket transport is unavailable (>5s timeout or airplane mode), emergency distress signals are automatically encoded into an ultra-compact $<60$-character SMS telemetry payload, dispatched via telecom networks, and ingested by the backend gateway (`POST /api/v1/sos/sms-webhook`) to initiate real-time rescue operations.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `mobile-app/utils/smsPayload.ts` (`encodeSOSPayload`, `sendEmergencySMS`).
  - `backend-spatial/src/modules/sos/sos.sms.ts` (`parseSOSPayload`, `sendSOSviaSMS`).
  - `backend-spatial/src/modules/sos/sos.service.ts` (`triggerSOS`).
  - `backend-spatial/src/modules/sos/sos.controller.ts` (`handleSMSWebhook`).
- **Blocked by**: Step 7.2 (Merged).
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking & Architectural Invariants

- **Compact Telemetry Invariant ($<60$ Characters)**:
  $$\text{SOS}|\text{LAT:}\langle\text{lat}\rangle|\text{LNG:}\langle\text{lng}\rangle|\text{BAT:}\langle\text{battery}\rangle|\text{UID:}\langle\text{userId}\rangle$$
  - Example: `SOS|LAT:18.7546|LNG:73.4062|BAT:15|UID:usr_tourist_01` (49 characters).
  - Fits within a single standard 160-character GSM SMS message with ample headroom for carrier routing headers.
- **Telecom Webhook Ingestion Pipeline (`POST /api/v1/sos/sms-webhook`)**:
  1. Ingests raw carrier webhook payload (`Body` / `body`, `From`).
  2. Parses telemetry tokens:
     - `lat`: Floating-point latitude $[-90, 90]$.
     - `lng`: Floating-point longitude $[-180, 180]$.
     - `battery`: Integer battery percentage $[0, 100]$.
     - `userId`: Identifier of triggering tourist.
  3. Triggers standard `sosService.triggerSOS()` state machine:
     - Evaluates environmental danger score.
     - Performs PostGIS $5\text{km}$ spherical proximity search (`ST_DWithin` on `::geography`).
     - Alerts nearby on-duty Yaatri Mitra volunteers.
     - Dispatches real-time push notifications.
  4. Returns `{ success: true, data: { parsed: {...}, triggered: true, sosEvent: {...} }, error: null }`.

---

## 4. API Contract & Payload Specifications

### 4.1 Inbound SMS Webhook
- **Method**: `POST`
- **Path**: `/api/v1/sos/sms-webhook`
- **Headers**: `Content-Type: application/json` or `application/x-www-form-urlencoded`
- **Request Body**:
  ```json
  {
    "Body": "SOS|LAT:18.7546|LNG:73.4062|BAT:22|UID:usr_tourist_01",
    "From": "+919876543210"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "parsed": {
        "type": "SOS",
        "lat": 18.7546,
        "lng": 73.4062,
        "battery": 22,
        "userId": "usr_tourist_01"
      },
      "triggered": true,
      "sosEvent": {
        "id": "sos_sms_01",
        "status": "VOLUNTEER_ALERTED"
      }
    },
    "error": null
  }
  ```

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: End-to-End SMS Fallback Test Suite (`backend-spatial/tests/e2e.sms-fallback.test.ts`)**
   - [ ] Test full webhook ingestion loop (`POST /api/v1/sos/sms-webhook` $\rightarrow$ parses payload $\rightarrow$ triggers SOS $\rightarrow$ alerts Yaatri Mitras).
   - [ ] Verify handling of lowercase `body` vs uppercase `Body` parameters for multi-carrier compatibility (Twilio, MSG91).
   - [ ] Verify graceful fallback when `userId` is missing from SMS (parses telemetry without throwing unhandled exceptions).
   - [ ] Verify validation errors on malformed payloads (empty body).
   - [ ] Verify cross-module client encoding consistency against `mobile-app/utils/smsPayload.ts`.

2. **Phase B: Verification & Full Suite Sanity Check**
   - [ ] Execute `backend-spatial/tests/e2e.sms-fallback.test.ts`.
   - [ ] Run full monorepo regression sweep across all modules.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/e2e.sms-fallback.test.ts
```

### Acceptance Checklist
- [ ] Inbound SMS webhook successfully parses compact $<60$-char payload.
- [ ] Valid SMS payload automatically spawns active `SOSEvent` with PostGIS proximity matching.
- [ ] Push notifications dispatched to nearby volunteers when triggered via SMS.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
