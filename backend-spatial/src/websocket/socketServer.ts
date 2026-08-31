/**
 * Safe Yatra — Backend Spatial Server
 * Socket.IO Server Bootstrap & Handshake JWT Authentication.
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { UserRole } from '@prisma/client';
import { authService } from '../modules/auth/auth.service';
import { env } from '../config/env';
import { roleRoom, userRoom, zoneRoom } from './rooms';
import { registerLocationHandler } from './handlers/locationUpdate';

export interface AuthenticatedSocketUser {
  id: string;
  email: string;
  role: UserRole;
}

declare module 'socket.io' {
  interface SocketData {
    user: AuthenticatedSocketUser;
  }
}

let ioInstance: SocketIOServer | null = null;

/**
 * Initializes and configures the Socket.IO server with JWT authentication and room management.
 */
export const initSocketServer = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin:
        env.NODE_ENV === 'production'
          ? (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['https://admin.safeyatra.app', 'https://safeyatra.app'])
          : '*',
      methods: ['GET', 'POST'],
    },
  });

  // 1. Handshake Authentication Middleware
  io.use((socket: Socket, next: (err?: Error) => void) => {
    const rawToken =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : null) ||
      socket.handshake.query?.token;

    const token = typeof rawToken === 'string' ? rawToken.trim() : null;

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const payload = authService.verifyToken(token, 'access');
      socket.data.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      };
      next();
    } catch {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  // 2. Connection Lifecycle & Room Management
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    // Automatically join private user room and role room
    if (user) {
      socket.join(userRoom(user.id));
      socket.join(roleRoom(user.role));
    }

    // Register domain event handlers
    registerLocationHandler(io, socket);

    // Dynamic Zone Room Subscriptions
    socket.on('zone:join', (data: { zoneId: string }) => {
      if (data && typeof data.zoneId === 'string' && data.zoneId.trim().length > 0) {
        socket.join(zoneRoom(data.zoneId.trim()));
      }
    });

    socket.on('zone:leave', (data: { zoneId: string }) => {
      if (data && typeof data.zoneId === 'string' && data.zoneId.trim().length > 0) {
        socket.leave(zoneRoom(data.zoneId.trim()));
      }
    });
  });

  ioInstance = io;
  return io;
};

/**
 * Returns the singleton Socket.IO instance.
 */
export const getIO = (): SocketIOServer => {
  if (!ioInstance) {
    throw new Error('Socket.IO server has not been initialized. Call initSocketServer first.');
  }
  return ioInstance;
};

/**
 * Gracefully closes the Socket.IO instance (useful for hermetic test teardowns).
 */
export const closeSocketServer = async (): Promise<void> => {
  if (ioInstance) {
    await new Promise<void>((resolve) => {
      ioInstance!.close(() => {
        ioInstance = null;
        resolve();
      });
    });
  }
};
