/**
 * Safe Yatra — Backend Spatial Server
 * Express.js application entry point & HTTP pipeline configuration.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env';
import { ok, fail } from './utils/response';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import volunteerRoutes from './modules/volunteer/volunteer.routes';
import zoneRoutes from './modules/zones/zone.routes';
import dangerRoutes from './modules/danger/danger.routes';
import geofenceRoutes from './modules/geofence/geofence.routes';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*', // Restrict in production
    methods: ['GET', 'POST'],
  },
});

// Global Security & Logging Middleware
app.use(helmet());
app.use(cors());
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Health check endpoint (Complies with standard ok() envelope)
app.get('/health', (_req, res) => {
  return ok(res, {
    status: 'healthy',
    service: 'backend-spatial',
    version: '1.0.0',
    simulation_mode: env.SIMULATION_MODE,
    timestamp: new Date().toISOString(),
  });
});

// Mount Feature Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/volunteers', volunteerRoutes);
app.use('/api/v1/zones', zoneRoutes);
app.use('/api/v1/danger', dangerRoutes);
app.use('/api/v1/geofences', geofenceRoutes);
// app.use('/api/v1/sos', sosRoutes);
// app.use('/api/v1/admin', adminRoutes);
// app.use('/api/v1/sim', simulationRoutes);

// Catch-all 404 handler for undefined routes
app.use((_req, res) => {
  return fail(res, 'NOT_FOUND', 'The requested resource was not found', 404);
});

// Global Error Handling Middleware
app.use(errorHandler);

// WebSocket connection handler
io.on('connection', (socket) => {
  if (env.NODE_ENV !== 'test') {
    console.log(`[WS] Client connected: ${socket.id}`);
  }

  socket.on('disconnect', () => {
    if (env.NODE_ENV !== 'test') {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    }
  });

  // TODO: Register event handlers
  // registerLocationHandlers(io, socket);
  // registerSOSHandlers(io, socket);
  // registerDangerHandlers(io, socket);
});

// Start HTTP server only if not running under automated tests
if (env.NODE_ENV !== 'test') {
  const PORT = env.PORT;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Safe Yatra Backend running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`📋 Simulation mode: ${env.SIMULATION_MODE ? 'ON' : 'OFF'}`);
  });
}

export { app, httpServer, io };
