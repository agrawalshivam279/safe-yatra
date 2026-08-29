# 📋 Technical Specification — Step 6.7: Broadcast Alert Composer

> **Step ID**: `6.7`  
> **Feature**: Broadcast Alert Composer  
> **Module**: `admin-dashboard`  
> **Status**: 📋 Planning / Spec Authored  
> **Target Branch**: `feat/step-6-7-admin-broadcast-composer`  
> **References**: [GEMINI.md](file:///d:/SIH%202026/GEMINI.md) (Section 5, 7, 9, 10), [implementation_plan.md](file:///d:/SIH%202026/implementation_plan.md) (Step 6.7)

---

## 1. Architectural Overview & Context

Step 6.7 implements the **Emergency Broadcast Alert Composer** (`src/app/broadcast/page.tsx`) in the Safe Yatra Admin Command Center. This page enables safety officers and disaster management authorities to broadcast instantaneous geo-targeted emergency advisories to tourists, pilgrims, and Yaatri Mitras across monitored sectors.

This step delivers:
1. **Broadcast Data Service (`src/services/broadcastService.ts`)**:
   - Transmits emergency alerts via `POST /api/v1/admin/broadcast`.
   - Real-time relay via Socket.IO `admin:broadcast` and FCM push.
2. **3-Step Guided Alert Composer Interface (`src/app/broadcast/page.tsx`)**:
   - **Step 1 — Sector Targeting**: Choose specific monitored geofence zone or nationwide broadcast.
   - **Step 2 — Advisory Details & Severity**: Title, detailed guidance message, severity tier (`INFO` 🔵, `WARNING` 🟠, `EMERGENCY` 🔴), and expiry duration.
   - **Step 3 — Interactive Mobile Push Preview & Dispatch**: Real-time smartphone notification simulator showing exact tourist mobile rendering, recipient estimation, and dispatch confirmation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   BROADCAST ALERT COMPOSER FLOW                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [Broadcast Form]                                                     │
│   • Sector: Tiger Point Cliff                                          │
│   • Severity: EMERGENCY 🔴                                             │
│   • Title: Sudden Flash Flood Advisory                                 │
│   • Message: Evacuate ravine trails immediately                        │
│                  │                                                     │
│                  ▼  (Real-Time Input Sync)                             │
│     ┌────────────────────────────────┐                                 │
│     │   Mobile Push Simulator        │  (Interactive Device Mock)      │
│     │   • 🛡️ Safe Yatra • Now        │                                 │
│     │   • EMERGENCY: Flash Flood     │                                 │
│     └────────────────┬───────────────┘                                 │
│                      │                                                 │
│                      ▼ (Transmit Broadcast)                            │
│     POST /api/v1/admin/broadcast                                       │
│                      │                                                 │
│                      ▼ (WebSocket Hub + Push Dispatch)                 │
│     Socket.IO: admin:broadcast ──► Mobile Apps & Field Responders      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granularity Sizing & 5-Gate Goldilocks Standard

| Gate | Criterion | Compliance Assessment |
| :--- | :--- | :--- |
| **Gate 1: LOC Limit** | $\le 500$ LOC UI / Client Core | $\approx 320$ LOC total across service, page view, and unit test suite. |
| **Gate 2: File Limit** | $\le 4$ target source files (+ tests) | 1 service file (`broadcastService.ts`) + 1 page (`src/app/broadcast/page.tsx`) + test suite. |
| **Gate 3: Single Concern**| 1 architectural domain | Sector-targeted emergency alert composition, mobile push preview, and dispatch. |
| **Gate 4: Verification** | 1 targeted test command | `npm test` in `admin-dashboard`. |
| **Gate 5: Context Headroom**| $\ge 40\%$ context window remaining | Reserved $\approx 45\%$ context budget for verify/ship cycles. |

---

## 3. Data Contracts & Interfaces

### 3.1 Broadcast Payload Model
```typescript
export interface SendBroadcastPayload {
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'EMERGENCY';
  zoneId?: string;
  expiresAt?: string;
}

export interface BroadcastResult {
  broadcastId: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'EMERGENCY';
  zoneId?: string;
  sentAt: string;
  recipientsCount?: number;
}
```

---

## 4. Test Strategy & Verification Plan

### Test Suite: `__tests__/broadcast-composer.test.tsx`
1. **Service Tests**: Validates `broadcastService.sendBroadcast()` formatting and endpoint invocation.
2. **Form Validation Tests**: Requires non-empty title and message before permitting submission.
3. **Live Simulator Sync Tests**: Typing in form fields dynamically updates the smartphone push notification preview.
4. **Dispatch Flow Tests**: Dispatches payload and displays confirmation receipt with recipient counts.

---

## 5. Sequential Thinking MCP Evaluation

> 🧠 **Sequential Thinking Heuristics Evaluation**:
> - **ML Danger Math**: N/A.
> - **PostGIS Spatial Queries**: Server-side broadcast relay.
> - **SOS Multi-State Transitions**: N/A.
> 
> **Verdict**: Standard form submission and mobile preview simulator; Sequential Thinking MCP is **skipped** for this step.
