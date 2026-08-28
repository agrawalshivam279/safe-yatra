# Backend Spatial Server

> Central API gateway and real-time communication hub for Safe Yatra.

## Overview

Handles authentication, user management, SOS dispatch, geofence management, and WebSocket event broadcasting. Built with Express.js + TypeScript, PostgreSQL/PostGIS for spatial queries, Redis for caching, and Socket.IO for real-time events.

## Tech Stack

- Node.js 20+
- Express.js + TypeScript
- Prisma ORM (PostgreSQL + PostGIS)
- Socket.IO (WebSocket)
- Bull (job queue)
- jsonwebtoken (JWT auth)
- turf.js (spatial utilities)

## Setup

```bash
npm install
cp .env.example .env  # Configure your environment variables
npx prisma migrate dev  # Run database migrations
npx prisma db seed  # Seed test data
npm run dev  # Start development server on port 3000
```

## Key Features

- 🔐 JWT Authentication (Tourist / Yaatri Mitra / Admin roles)
- 📍 PostGIS spatial queries for geofence and proximity matching
- 🆘 SOS dispatch with nearest-volunteer matching
- 📡 WebSocket real-time events (danger alerts, SOS tracking)
- 📱 FCM push notifications
- 📨 SMS fallback via Twilio

## Architecture

See [GEMINI.md](../GEMINI.md#5-module-2-backend-spatial-server) for full details.
