/**
 * Safe Yatra — Mobile App
 * Resilient Socket.IO Client Service with Auth Token Injection & Event Hub.
 */

import { io, Socket } from 'socket.io-client';
import { storage } from './storage';

export interface LocationPayload {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
}

export interface GeofenceAlertPayload {
  zoneId: string;
  zoneName: string;
  dangerScore: number;
  tier: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  breachType: 'ENTRY' | 'PROXIMITY' | 'EXIT';
  justification: string;
  timestamp: string;
}

export interface SOSUpdatePayload {
  sosId: string;
  status: 'TRIGGERED' | 'ASSIGNED' | 'EN_ROUTE' | 'RESOLVED' | 'CANCELLED';
  responderName?: string;
  responderPhone?: string;
  responderLat?: number;
  responderLng?: number;
}

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;

  public async connect(): Promise<Socket> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.isConnecting && this.socket) {
      return this.socket;
    }

    this.isConnecting = true;
    const token = await storage.getAccessToken();

    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: {
        token: token ? `Bearer ${token}` : undefined,
      },
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
    });

    this.socket.on('connect_error', () => {
      this.isConnecting = false;
    });

    this.socket.on('disconnect', () => {
      this.isConnecting = false;
    });

    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return !!this.socket?.connected;
  }

  public emitLocationUpdate(location: LocationPayload): boolean {
    if (this.socket && this.socket.connected) {
      this.socket.emit('location:update', location);
      return true;
    }
    return false;
  }

  public onGeofenceAlert(callback: (alert: GeofenceAlertPayload) => void): () => void {
    if (!this.socket) {
      this.connect();
    }

    const handler = (data: GeofenceAlertPayload) => {
      callback(data);
    };

    this.socket?.on('geofence:alert', handler);

    return () => {
      this.socket?.off('geofence:alert', handler);
    };
  }

  public onSOSUpdate(callback: (update: SOSUpdatePayload) => void): () => void {
    if (!this.socket) {
      this.connect();
    }

    const handler = (data: SOSUpdatePayload) => {
      callback(data);
    };

    this.socket?.on('sos:update', handler);

    return () => {
      this.socket?.off('sos:update', handler);
    };
  }

  public joinZone(zoneId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join:zone', { zoneId });
    }
  }

  public leaveZone(zoneId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave:zone', { zoneId });
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }
}

export const socketService = new SocketService();
export default socketService;
