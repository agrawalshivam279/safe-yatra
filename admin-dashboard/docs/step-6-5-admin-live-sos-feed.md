# 📋 Technical Specification — Step 6.5: Live SOS Feed Page (Key Demo Screen)

> **Step ID**: `6.5`  
> **Feature**: Live SOS Feed Page (Key Demo Screen)  
> **Module**: `admin-dashboard`  
> **Status**: 📋 Planning / Spec Authored  
> **Target Branch**: `feat/step-6-5-admin-live-sos-feed`  
> **References**: [GEMINI.md](file:///d:/SIH%202026/GEMINI.md) (Section 5, 7, 9, 10, 12), [implementation_plan.md](file:///d:/SIH%202026/implementation_plan.md) (Step 6.5)

---

## 1. Architectural Overview & Context

Step 6.5 implements the **Live Emergency SOS Command Feed** (`src/app/sos/page.tsx`), the premier operational and judging demo showcase in Safe Yatra. This screen provides incident commanders with a synchronized split-view command environment:
- **Left Panel (`SOSListPanel`)**: Live scrolling queue of distress calls (sorted newest first), featuring battery health meters, caller contact info, voice note audio player, and status badges (`PENDING`, `ACCEPTED`, `ARRIVED`, `RESOLVED`, `CANCELLED`).
- **Right Panel (`SOSMapPanel`)**: Real-time tactical dispatch map auto-focused on the active distress call, plotting the tourist position (pulsing red beacon), dispatched Yaatri Mitras (pulsing blue beacons), live response trajectory, and dynamic walking distance / ETA countdown in minutes.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   LIVE SOS SPLIT-VIEW COMMAND HUB                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Backend Spatial Socket.IO Gateway                                    │
│   (sos:triggered, sos:accepted, sos:mitra_location, sos:resolved)      │
│                  │                                                     │
│                  ▼  (Real-Time WebSocket Stream)                       │
│     ┌────────────────────────────────┐                                 │
│     │        useLiveSOS Hook         │◄─────── GET /api/v1/sos/active  │
│     └────────────────┬───────────────┘         (Initial Hydration)     │
│                      │                                                 │
│                      ▼                                                 │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 Live SOS Command Page (/sos)                   │   │
│   │                                                                │   │
│   │  ┌─────────────────────────┐  ┌─────────────────────────────┐  │   │
│   │  │   SOS Queue Panel       │  │   Tactical Map Panel        │  │   │
│   │  │   • [NEW] Rahul Sharma  │  │   • Tourist Marker (Red)    │  │   │
│   │  │     Battery: 42% 🔋     │  │   • Mitra Marker (Blue)     │  │   │
│   │  │     Audio Recording ▶   │  │   • ETA: 3.2 min (240m)     │  │   │
│   │  │     Status: ACCEPTED    │  │   • Live GPS Tracking       │  │   │
│   │  │   • [RESOLVED] Event #2 │  │                             │  │   │
│   │  └─────────────────────────┘  └─────────────────────────────┘  │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granularity Sizing & 5-Gate Goldilocks Standard

| Gate | Criterion | Compliance Assessment |
| :--- | :--- | :--- |
| **Gate 1: LOC Limit** | $\le 500$ LOC UI / Client Core | $\approx 360$ LOC total across service, reactive hook, list panel, map panel, and page. |
| **Gate 2: File Limit** | $\le 4$ target source files (+ tests) | 3 source files (`sosService.ts`, `SOSListPanel.tsx`, `SOSMapPanel.tsx`) + 1 page + test suite. |
| **Gate 3: Single Concern**| 1 architectural domain | Live distress queue management, responder dispatch telemetry, and tactical map rendering. |
| **Gate 4: Verification** | 1 targeted test command | `npm test` in `admin-dashboard`. |
| **Gate 5: Context Headroom**| $\ge 40\%$ context window remaining | Reserved $\approx 55\%$ context budget for verify/ship cycles. |

---

## 3. Data Contracts & State Lifecycle Invariants

### 3.1 SOS Event Data Model
```typescript
export interface SOSEvent {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  location: {
    lat: number;
    lng: number;
  };
  batteryLevel?: number;
  audioRecordingUrl?: string;
  status: 'PENDING' | 'ACCEPTED' | 'ARRIVED' | 'RESOLVED' | 'CANCELLED';
  createdAt: string;
  responders?: Array<{
    id: string;
    name: string;
    phone?: string;
    location?: {
      lat: number;
      lng: number;
    };
    status: string;
    batteryLevel?: number;
  }>;
}
```

### 3.2 Real-Time Dispatch Invariants (Evaluated via Sequential Thinking MCP)
- **Live Ingestion**: `sos:triggered` prepends incoming emergencies to state with an unread badge.
- **Responder Tracking**: `sos:mitra_location` dynamically updates the responder's coordinates without replacing the entire SOS list.
- **Dynamic ETA Calculation**: Calculated using the Haversine formula ($d = 2R \cdot \arcsin(\dots)$) with walking speed constant ($4.5\text{ km/h}$) to produce `distanceMeters` and `etaMinutes`.

---

## 4. Test Strategy & Verification Plan

### Test Suite: `__tests__/live-sos-feed.test.tsx`
1. **Service Tests**: Validates `sosService.getActiveSOS()` querying `GET /api/v1/sos/active`.
2. **List Panel Tests**: Renders emergency entries, caller info, battery pill, status badges, and audio player.
3. **Tactical Map Tests**: Renders tourist distress marker, responder positions, and live distance/ETA metrics.
4. **Real-Time Hook Tests**: Simulates incoming `sos:triggered` and `sos:mitra_location` events mutating state live.

---

## 5. Sequential Thinking MCP Evaluation

> 🧠 **Sequential Thinking MCP Execution**: Complete (Thoughts 1 & 2 evaluated real-time ingestion, immutable state updates, Haversine ETA math, and audio playback invariants).
