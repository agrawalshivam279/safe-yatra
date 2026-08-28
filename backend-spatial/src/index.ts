/**
 * Safe Yatra — Backend Spatial Server
 * Express.js application entry point.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*', // Restrict in production
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'backend-spatial',
    version: '1.0.0',
    simulation_mode: process.env.SIMULATION_MODE === 'true',
    timestamp: new Date().toISOString(),
  });
});

// TODO: Import and mount route modules
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/danger', dangerRoutes);
// app.use('/api/v1/sos', sosRoutes);
// app.use('/api/v1/geofences', geofenceRoutes);
// app.use('/api/v1/volunteers', volunteerRoutes);
// app.use('/api/v1/admin', adminRoutes);
// app.use('/api/v1/sim', simulationRoutes);

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });

  // TODO: Register event handlers
  // registerLocationHandlers(io, socket);
  // registerSOSHandlers(io, socket);
  // registerDangerHandlers(io, socket);
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Safe Yatra Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`📋 Simulation mode: ${process.env.SIMULATION_MODE === 'true' ? 'ON' : 'OFF'}`);
});

export { app, io };
