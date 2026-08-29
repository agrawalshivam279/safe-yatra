# 📄 Technical Specification: Tourist Home Map Screen with Danger Polygons & Floating Panic SOS

> **Step ID**: `5.4`  
> **Target Module**: `mobile-app`  
> **Git Feature Branch**: `feat/step-5-4-tourist-home-map`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 5.4 delivers the central visual centerpiece of the Safe Yatra tourist experience — the **Tourist Home Map Screen** (`app/(tourist)/index.tsx`), built in modular layers:
1. **Layer 1 (Base Map)**: `react-native-maps` `MapView` with sleek dark mode map styling centered on user coordinates (or pilgrimage hotspot fallback).
2. **Layer 2 (Danger Polygons)**: Real-time dynamic danger polygons fetched from `GET /api/v1/danger/zones` and colored according to their danger tier:
   - 🟢 `LOW`: `rgba(39, 174, 96, 0.30)` (stroke: `#27AE60`)
   - 🟡 `MODERATE`: `rgba(243, 156, 18, 0.35)` (stroke: `#F39C12`)
   - 🟠 `SEVERE`: `rgba(230, 126, 34, 0.45)` (stroke: `#E67E22`)
   - 🔴 `CRITICAL`: `rgba(231, 76, 60, 0.55)` (stroke: `#E74C3C`)
3. **Layer 3 (User GPS Marker)**: Real-time user position marker with pulsing blue accuracy halo.
4. **Layer 4 (Floating SOS Panic Button)**: Persistent high-visibility emergency SOS button (`components/sos/SOSButton.tsx`) positioned at bottom right with emergency trigger navigation.
5. **Layer 5 (Tourist Tab Layout)**: Expo Router tab navigation (`app/(tourist)/_layout.tsx`) connecting Map, Alerts, Briefing, SOS, and Profile.

---

## 2. Spatial & GeoJSON Invariants

- **Coordinate Transformation**: PostGIS GeoJSON polygons provide coordinates as `[lng, lat]` pairs (`coords[0]`). `react-native-maps` `Polygon` expects `{ latitude: number, longitude: number }[]`. The parser must invert `[lng, lat]` to `{ latitude: lat, longitude: lng }`.
- **Hole Handling**: If the boundary is a Polygon with interior rings, the outer boundary `coordinates[0]` is used for outer geometry.

---

## 3. ♿ Mobile Accessibility & UI Invariants

- **SOS Panic Button Target**: Large circular touch target (diameter $68\text{dp} \ge 48\times 48\text{dp}$) with `accessible={true}`, `accessibilityRole="button"`, `accessibilityLabel="Emergency SOS Panic Button"`.
- **Zone Callout Cards**: Accessible descriptions announcing zone name, score, and danger tier.

---

## 4. Step-by-Step Implementation Sequence

1. **Phase A: DangerZoneMap Component (`components/maps/DangerZoneMap.tsx`)**
   - [ ] Implement `DangerZoneMap` with GeoJSON polygon parser, tier color mapper, and `MapView` layer.
2. **Phase B: Floating SOSButton (`components/sos/SOSButton.tsx`)**
   - [ ] Implement high-visibility panic button with pulsing animation.
3. **Phase C: Tourist Tab Layout (`app/(tourist)/_layout.tsx`)**
   - [ ] Implement Expo Router `Tabs` layout.
4. **Phase D: Tourist Home Screen (`app/(tourist)/index.tsx`)**
   - [ ] Assemble map layers, zone summary pill, refresh trigger, and SOS button.
5. **Phase E: Component & Integration Tests (`__tests__/tourist-map.test.tsx`)**
   - [ ] Test polygon rendering, color mapping, GeoJSON parsing, and SOS button trigger.

---

## 5. Verification & Acceptance Criteria

```bash
cd mobile-app && npm test -- __tests__/tourist-map.test.tsx
```

- [ ] Polygons render correctly with all 4 tier color mappings.
- [ ] GeoJSON `[lng, lat]` coordinates correctly convert to `{ latitude, longitude }`.
- [ ] Floating SOS button is rendered persistently and triggers emergency callback.
- [ ] 100% test pass rate with zero TypeScript errors.
