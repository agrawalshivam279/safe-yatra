/**
 * Safe Yatra — Backend Spatial Server
 * Unit and Integration tests for Socket.IO Server & Room Management (Step 4.10a).
 */

import { UserRole } from '@prisma/client';
import { createServer, Server as HTTPServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient } from 'socket.io-client';
import { authService } from '../src/modules/auth/auth.service';
import {
  emitToAll,
  emitToRole,
  emitToUser,
  emitToZone,
  roleRoom,
  userRoom,
  zoneRoom,
} from '../src/websocket/rooms';
import {
  closeSocketServer,
  getIO,
  initSocketServer,
} from '../src/websocket/socketServer';

describe('WebSocket Server Bootstrap & Room Management (Step 4.10a)', () => {
  describe('Room Helper Utilities (rooms.ts)', () => {
    it('should format room strings properly', () => {
      expect(userRoom('usr_123')).toBe('user:usr_123');
      expect(roleRoom('YAATRI_MITRA')).toBe('role:YAATRI_MITRA');
      expect(zoneRoom('zone_lonavala')).toBe('zone:zone_lonavala');
    });

    it('should invoke socket emission methods correctly', () => {
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      const mockIO: any = {
        to: mockTo,
        emit: mockEmit,
      };

      emitToUser(mockIO, 'usr_1', 'alert', { msg: 'help' });
      expect(mockTo).toHaveBeenCalledWith('user:usr_1');
      expect(mockEmit).toHaveBeenCalledWith('alert', { msg: 'help' });

      emitToRole(mockIO, 'ADMIN', 'admin:alert', { count: 5 });
      expect(mockTo).toHaveBeenCalledWith('role:ADMIN');
      expect(mockEmit).toHaveBeenCalledWith('admin:alert', { count: 5 });

      emitToZone(mockIO, 'zone_1', 'danger:update', { score: 85 });
      expect(mockTo).toHaveBeenCalledWith('zone:zone_1');
      expect(mockEmit).toHaveBeenCalledWith('danger:update', { score: 85 });

      emitToAll(mockIO, 'broadcast', { text: 'test' });
      expect(mockEmit).toHaveBeenCalledWith('broadcast', { text: 'test' });
    });
  });

  describe('Socket.IO Connection & Handshake Authentication (socketServer.ts)', () => {
    let httpServer: HTTPServer;
    let serverPort: number;
    let touristToken: string;
    let mitraToken: string;

    beforeAll((done) => {
      httpServer = createServer();
      initSocketServer(httpServer);

      httpServer.listen(0, () => {
        const address = httpServer.address() as AddressInfo;
        serverPort = address.port;
        done();
      });

      touristToken = authService.generateTokens({
        id: 'usr_tourist_01',
        email: 'tourist@safeyatra.in',
        role: UserRole.TOURIST,
      }).accessToken;

      mitraToken = authService.generateTokens({
        id: 'usr_mitra_01',
        email: 'mitra@safeyatra.in',
        role: UserRole.YAATRI_MITRA,
      }).accessToken;
    });

    afterAll(async () => {
      await closeSocketServer();
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    });

    it('should return the singleton IO instance from getIO()', () => {
      const io = getIO();
      expect(io).toBeDefined();
    });

    it('should reject connection when no token is provided in handshake', (done) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect_error', (err: Error) => {
        expect(err.message).toMatch(/Authentication error: Token required/);
        client.disconnect();
        done();
      });
    });

    it('should reject connection when invalid token is provided', (done) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: 'invalid_expired_token' },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect_error', (err: Error) => {
        expect(err.message).toMatch(/Authentication error: Invalid or expired token/);
        client.disconnect();
        done();
      });
    });

    it('should authenticate successfully with valid JWT token in auth payload', (done) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: touristToken },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });
    });

    it('should authenticate successfully with Bearer token in headers', (done) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        extraHeaders: {
          authorization: `Bearer ${mitraToken}`,
        },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });
    });

    it('should allow joining and leaving dynamic zone rooms', (done) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: touristToken },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect', () => {
        client.emit('zone:join', { zoneId: 'zone_lonavala_01' });

        setTimeout(() => {
          // Listen for a zone broadcast
          client.on('zone:event', (payload: { message: string }) => {
            expect(payload.message).toBe('Zone alert');
            client.emit('zone:leave', { zoneId: 'zone_lonavala_01' });
            client.disconnect();
            done();
          });

          // Server emits to zone
          emitToZone(getIO(), 'zone_lonavala_01', 'zone:event', {
            message: 'Zone alert',
          });
        }, 50);
      });
    });

    it('should deliver private targeted messages to user room', (done) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: touristToken },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect', () => {
        client.on('user:alert', (data: { alertId: string }) => {
          expect(data.alertId).toBe('alt_01');
          client.disconnect();
          done();
        });

        setTimeout(() => {
          emitToUser(getIO(), 'usr_tourist_01', 'user:alert', { alertId: 'alt_01' });
        }, 50);
      });
    });
  });
});
