# Mobile App

> Cross-platform mobile application for Tourists and Yaatri Mitra volunteers.

## Overview

Built with React Native (Expo), this app serves two user roles:

- **Tourist**: View danger zones on interactive map, receive geofence alerts, trigger SOS, get pre-trip safety briefings
- **Yaatri Mitra**: Receive proximity-based SOS alerts, navigate to tourists in distress, provide first-response assistance

## Tech Stack

- React Native + Expo SDK 51
- Expo Router (file-based routing)
- TypeScript
- react-native-maps (Google Maps)
- expo-location (background GPS)
- expo-notifications (FCM push)
- Socket.IO client (real-time updates)

## Setup

```bash
npm install
cp .env.example .env  # Configure API URLs and keys
npx expo start        # Start Expo dev server
```

### Running on devices
```bash
npx expo start --android   # Android emulator/device
npx expo start --ios       # iOS simulator (macOS only)
npx expo start --web       # Web preview
```

## Key Screens

### Tourist Mode
| Screen | Description |
|--------|-------------|
| Home (Map) | Interactive map with color-coded danger zone polygons |
| Alerts | Push notification history |
| Briefing | Pre-trip safety briefing for destinations |
| SOS | One-tap panic button with GPS lock + audio recording |
| Profile | User settings and preferences |

### Yaatri Mitra Mode
| Screen | Description |
|--------|-------------|
| Home | Nearby SOS alerts dashboard |
| Active SOS | Real-time navigation to tourist in distress |
| History | Past response history with stats |
| Profile | Duty toggle, verification status |

## Architecture

See [GEMINI.md](../GEMINI.md#6-module-3-mobile-app) for full details.
