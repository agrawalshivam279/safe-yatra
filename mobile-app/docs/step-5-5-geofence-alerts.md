# 📄 Technical Specification: Background Location Streaming & Geofence Alerts with 3-Second Hold Confirmation

> **Step ID**: `5.5`  
> **Target Module**: `mobile-app`  
> **Git Feature Branch**: `feat/step-5-5-geofence-alerts`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 5.5 establishes the real-time proactive safety loop of Safe Yatra:
1. **Socket.IO Client (`services/socketService.ts`)**: Resilient WebSocket connection manager injecting JWT credentials and handling bi-directional real-time events (`location:update`, `geofence:alert`, `sos:status`).
2. **Location Streaming Engine (`services/locationService.ts`)**: Foreground and background GPS tracking using `expo-location` streaming coordinates every 15–30 seconds.
3. **Geofence Hook (`hooks/useGeofence.ts`)**: Real-time event listener managing active breach state and accessibility announcements.
4. **Critical Geofence Warning Modal (`components/alerts/GeofenceWarning.tsx`)**: High-priority modal with justification text, "Turn Back" primary escape action, and **3-Second Hold Confirmation** for "I Understand the Risk" to eliminate accidental dismissals.

---

## 2. Real-Time Protocol Invariants

- **Location Update Payload (`location:update`)**:
  ```json
  {
    "lat": 30.7352,
    "lng": 79.0669,
    "accuracy": 5.2,
    "speed": 1.1,
    "batteryLevel": 85
  }
  ```
- **Geofence Alert Payload (`geofence:alert`)**:
  ```json
  {
    "zoneId": "zone-kedarnath-01",
    "zoneName": "Kedarnath Glacier Path",
    "dangerScore": 88,
    "tier": "CRITICAL",
    "breachType": "ENTRY",
    "justification": "Active flash flood warning with high precipitation upstream.",
    "timestamp": "2026-08-29T14:30:00Z"
  }
  ```

---

## 3. ♿ Accessibility & 3-Second Hold Confirmation

- **3-Second Hold Timer**: Animated progress bar (0% to 100% over 3000ms). Resetting immediately if touch is released early.
- **Screen Reader Announcements**: `AccessibilityInfo.announceForAccessibility` announces: `"Critical Hazard Warning: You have entered high hazard zone..."`.

---

## 4. Step-by-Step Implementation Sequence

1. **Phase A: Socket Manager (`services/socketService.ts`)**
   - [ ] Implement Socket.IO client singleton with token injection and typed event emitters/listeners.
2. **Phase B: Location Service (`services/locationService.ts`)**
   - [ ] Implement permission request flow and location tracking engine.
3. **Phase C: Geofence Hook (`hooks/useGeofence.ts`)**
   - [ ] Implement hook listening to `geofence:alert` events.
4. **Phase D: Geofence Warning Modal (`components/alerts/GeofenceWarning.tsx`)**
   - [ ] Implement full-screen modal with 3-second hold confirmation.
5. **Phase E: Integration Tests (`__tests__/geofence-alerts.test.tsx`)**
   - [ ] Test location emission, alert listening, hold timer completion, and early cancel.

---

## 5. Verification & Acceptance Criteria

```bash
cd mobile-app && npm test -- __tests__/geofence-alerts.test.tsx
```

- [ ] `location:update` emits valid coordinates to Socket.IO.
- [ ] `geofence:alert` triggers `GeofenceWarning` modal.
- [ ] Releasing button before 3000ms resets progress bar without acknowledging.
- [ ] Holding button for 3000ms triggers risk acknowledgment.
- [ ] 100% test pass rate with zero TypeScript errors.
