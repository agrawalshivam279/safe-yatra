# Admin Dashboard

> Command Center portal for government authorities and emergency management agencies.

## Overview

A Next.js 14 web application providing real-time oversight of the Safe Yatra ecosystem:

- 🗺️ **Macro Heatmaps**: Crowd density, danger score spikes, weather threats
- 🆘 **Live SOS Tracking**: Auto-focusing map with tourist + volunteer positions and ETAs
- 🚧 **Zone Management**: Create/edit geofence polygons, override danger scores
- 📢 **Broadcast Alerts**: Push emergency alerts to all tourists in a geographic sector
- 📊 **Analytics**: Historical incident timelines, response time charts

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Mapbox GL JS (heatmaps, geofence drawing)
- Recharts (analytics charts)
- Socket.IO client (real-time events)
- TanStack Query (data fetching)

## Setup

```bash
npm install
cp .env.example .env  # Configure API URLs and tokens
npm run dev           # Start on http://localhost:3001
```

## Architecture

See [GEMINI.md](../GEMINI.md#7-module-4-admin-dashboard) for full details.
