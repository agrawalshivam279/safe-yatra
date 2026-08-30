# 🏆 Safe Yatra — SIH 2026 Official 2-Minute Judge Demo Playbook

> **Target Audience**: Smart India Hackathon (SIH 2026) Evaluation Panel & Jury  
> **Total Duration**: Exactly 120 Seconds (2 Minutes)  
> **Core Narrative**: *Predict $\rightarrow$ Prevent $\rightarrow$ Respond $\rightarrow$ Command*  
> **Demo Devices**: 
> 1. **Screen 1 (Projector/Laptop)**: Next.js Admin Command Center (`http://localhost:3000`)
> 2. **Screen 2 (Mobile Device A)**: Tourist Interface (`mobile-app`)
> 3. **Screen 3 (Mobile Device B / Split Screen)**: Yaatri Mitra Volunteer Interface (`mobile-app`)

---

## ⏱️ Chronological 120-Second Presentation Sequence

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     SAFE YATRA — 2-MINUTE DEMO CHRONOLOGY                       │
├───────────────────┬───────────────────┬───────────────────┬─────────────────────┤
│ 0:00 – 0:25       │ 0:25 – 0:50       │ 0:50 – 1:20       │ 1:20 – 2:00         │
│ PREDICT & COMMAND │ PREVENT           │ RESPOND           │ RESOLVE & AUDIT     │
├───────────────────┼───────────────────┼───────────────────┼─────────────────────┤
│ • Admin Dashboard │ • Tourist walks   │ • SOS triggered   │ • Mitra arrives &   │
│ • Live Heatmap    │   into hazard     │ • ML score (82)   │   resolves incident │
│ • 5 Golden Zones  │ • 500m proximity  │ • PostGIS matcher │ • Live ETA & trail  │
│ • Weather/Crowd   │ • Critical Modal  │ • Mitra receives  │ • Immutable audit   │
│   telemetry       │   fires live      │   push alert      │   timeline in DB    │
└───────────────────┴───────────────────┴───────────────────┴─────────────────────┘
```

---

### 1️⃣ [0:00 – 0:25] Pillar 1 & 4: PREDICT & COMMAND (Admin Dashboard)

- **Visual on Screen**: Next.js Admin Command Center (`/zones` & `/heatmap`).
- **Presenter Script**:
  > *"Respected judges, tourist and pilgrimage safety in India is currently reactive. Safe Yatra transforms it into a proactive, intelligent ecosystem.  
  > On our Admin Command Center, you are viewing the live Lonavala Pilgrimage Sector. Our ML Risk Engine dynamically calculates a 0 to 100 danger score by fusing real-time rainfall, terrain slope, footfall density, and 10 years of historical incident data.  
  > Notice Bhushi Dam is glowing Red at Danger Score 85 due to 180mm upstream rainfall. Our PostGIS engine maintains dynamic geofences and privacy-preserving footfall heatmaps in real-time."*
- **Action**: Click on **Bhushi Dam Waterfall Zone** on the map $\rightarrow$ show score breakdown modal (Weather $92\%$, Terrain $88\%$, Crowd $65\%$, History $78\%$).

---

### 2️⃣ [0:25 – 0:50] Pillar 2: PREVENT (Tourist Mobile App & Geofencing)

- **Visual on Screen**: Switch focus to Tourist Mobile Screen (`mobile-app`).
- **Presenter Script**:
  > *"Now, let us switch to our tourist, Priya. As she explores the area, our app runs background spatial checks without draining battery.  
  > As Priya approaches within 500 meters of the waterfall gorge, she immediately receives a high-priority proximity advisory.  
  > When our simulation moves her directly inside the flash flood breach boundary, watch what happens: an instant, full-screen Critical Warning Modal locks her screen with evacuation instructions and a 1-tap SOS panic button."*
- **Action**: Run `scripts/demo-simulation.ps1 -Scenario GeofenceWalk` or advance simulation waypoint $\rightarrow$ Observe Mobile Tourist UI pop up the **CRITICAL Warning Modal**.

---

### 3️⃣ [0:50 – 1:20] Pillar 3: RESPOND (Panic Trigger & Yaatri Mitra Dispatch)

- **Visual on Screen**: Split-view between Tourist Screen and Yaatri Mitra Screen.
- **Presenter Script**:
  > *"Priya taps the Big Red SOS Button.  
  > In milliseconds, our backend tags her emergency with real-time danger telemetry, creates an immutable timeline audit record, and executes a PostGIS spherical query across nearby verified 'Yaatri Mitra' community volunteers.  
  > Even if data drops, our system automatically falls back to an ultra-compact sub-60-character SMS payload.  
  > Instantly, nearby volunteer Suresh receives a high-priority dispatch push alert with Priya's exact GPS location and hazard tier."*
- **Action**: Tap **HOLD SOS FOR 3 SECONDS** $\rightarrow$ Mitra's phone rings with emergency dispatch notification $\rightarrow$ Admin Dashboard auto-focuses on the SOS marker with flashing red pulse.

---

### 4️⃣ [1:20 – 1:45] Pillar 3: RESCUE & COORDINATION (Mitra Accepts & Live ETA)

- **Visual on Screen**: Yaatri Mitra Mobile Screen & Admin Live Tracker.
- **Presenter Script**:
  > *"Suresh taps 'ACCEPT RESCUE'.  
  > The tourist immediately sees Suresh's verified badge, photo, phone, and real-time walking ETA (2 minutes, 280 meters).  
  > Meanwhile, on the Admin Command Center, safety officers observe the live telemetry and rescue trajectory in real time via WebSockets."*
- **Action**: Mitra taps **ACCEPT** $\rightarrow$ Tourist screen transitions to **RESCUER EN ROUTE** with live countdown timer $\rightarrow$ Admin dashboard updates status badge to `VOLUNTEER_ACCEPTED`.

---

### 5️⃣ [1:45 – 2:00] Pillar 4: RESOLVE & AUDIT (Incident Closure & Memory)

- **Visual on Screen**: Mitra Screen $\rightarrow$ Admin Dashboard `/analytics`.
- **Presenter Script**:
  > *"Suresh arrives on scene, assists Priya to safety, and marks 'RESOLVE INCIDENT' with field notes.  
  > All parties are updated in under 50 milliseconds. The incident is archived into our immutable PostGIS audit ledger, feeding back into our ML model to prevent future disasters.  
  > Safe Yatra: Predict, Prevent, Respond, and Command. Thank you!"*
- **Action**: Mitra taps **MARK RESOLVED** $\rightarrow$ Tourist receives safety confirmation modal $\rightarrow$ Admin dashboard updates analytics counters live.

---

## 🛠️ One-Click Simulation Execution

### Windows (PowerShell)
```powershell
.\scripts\demo-simulation.ps1 -Scenario FullDemo
```

### Linux / macOS (Bash)
```bash
./scripts/demo-simulation.sh full-demo
```

---

## 🎯 Jury Defense & Technical FAQs

| Potential Judge Question | Technical Response |
| :--- | :--- |
| **"What happens if there is no internet in remote hills?"** | *"Safe Yatra implements an Offline-First SMS fallback. When data connectivity drops, the app encodes telemetry into a compact `<60`-character GSM SMS (`SOS\|LAT:...\|LNG:...\|BAT:...\|UID:...`) and triggers telecom webhooks, or dials native emergency services (`tel:112`)."* |
| **"How do you prevent false alarms or volunteer spam?"** | *"All Yaatri Mitras are Aadhaar-verified and on-duty rated. Spatial dispatch uses PostGIS `ST_DWithin` bounded to a 5km radius, prioritizing responders with high rating and response velocity."* |
| **"How fast are spatial lookups under peak crowd loads?"** | *"Our spatial GiST indexes on PostGIS execute volunteer proximity and point-in-polygon queries in under 2ms, backed by Redis 300s TTL caching for danger scores."* |
