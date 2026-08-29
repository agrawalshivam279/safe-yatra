/**
 * Safe Yatra — Admin Dashboard Socket.IO Gateway
 * Singleton real-time client connecting with admin JWT token and managing event listeners.
 */

import { io, Socket } from 'socket.io-client';
import { storage } from './storage';

export interface SOSTriggeredEvent {
  sosId: string;
  userId: string;
  touristName?: string;
  location: {
    lat: number;
    lng: number;
  };
  batteryLevel?: number;
  audioUrl?: string;
  timestamp: string;
  nearestMitras?: Array<{
    userId: string;
    name: string;
    distanceMeters: number;
  }>;
}

export interface SOSAcceptedEvent {
  sosId: string;
  volunteerId: string;
  volunteerName?: string;
  volunteerLocation?: {
    lat: number;
    lng: number;
  };
  etaMinutes?: number;
  timestamp: string;
}

export interface MitraLocationEvent {
  sosId: string;
  volunteerId: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
}

export interface SOSArrivedEvent {
  sosId: string;
  volunteerId: string;
  timestamp: string;
}

export interface SOSResolvedEvent {
  sosId: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  timestamp: string;
}

export interface SOSCancelledEvent {
  sosId: string;
  reason?: string;
  timestamp: string;
}

export interface DangerScoreUpdateEvent {
  zoneId: string;
  dangerScore: number;
  tier: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  factors: {
    weather: { score: number; weight: number };
    terrain: { score: number; weight: number };
    crowd: { score: number; weight: number };
    history: { score: number; weight: number };
  };
  computedAt: string;
  justification?: string;
}

export interface BroadcastAlertEvent {
  broadcastId: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'EMERGENCY';
  targetArea?: any;
  expiresAt: string;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

class AdminSocketService {
  private socket: Socket | null = null;

  /**
   * Connect to the Socket.IO server with JWT authentication.
   */
  public connect(authToken?: string): Socket {
    const token = authToken || storage.getAuthToken();

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token ? `Bearer ${token}` : undefined,
      },
      extraHeaders: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    return this.socket;
  }

  /**
   * Disconnect the active socket session.
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check connection status.
   */
  public isConnected(): boolean {
    return Boolean(this.socket && this.socket.connected);
  }

  /**
   * Return socket instance.
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Join a specific zone room for localized updates.
   */
  public joinZone(zoneId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('zone:join', { zoneId });
    }
  }

  /**
   * Leave a specific zone room.
   */
  public leaveZone(zoneId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('zone:leave', { zoneId });
    }
  }

  // --- Typed Event Listeners with Cleanup Callbacks ---

  public onSOSTriggered(callback: (data: SOSTriggeredEvent) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('sos:triggered', callback);
    return () => {
      this.socket?.off('sos:triggered', callback);
    };
  }

  public onSOSAccepted(callback: (data: SOSAcceptedEvent) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('sos:accepted', callback);
    return () => {
      this.socket?.off('sos:accepted', callback);
    };
  }

  public onMitraLocation(callback: (data: MitraLocationEvent) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('sos:mitra_location', callback);
    return () => {
      this.socket?.off('sos:mitra_location', callback);
    };
  }

  public onSOSArrived(callback: (data: SOSArrivedEvent) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('sos:arrived', callback);
    return () => {
      this.socket?.off('sos:arrived', callback);
    };
  }

  public onSOSResolved(callback: (data: SOSResolvedEvent) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('sos:resolved', callback);
    return () => {
      this.socket?.off('sos:resolved', callback);
    };
  }

  public onSOSCancelled(callback: (data: SOSCancelledEvent) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('sos:cancelled', callback);
    return () => {
      this.socket?.off('sos:cancelled', callback);
    };
  }

  public onDangerScoreUpdate(callback: (data: DangerScoreUpdateEvent) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('danger:score_update', callback);
    return () => {
      this.socket?.off('danger:score_update', callback);
    };
  }

  public onBroadcastAlert(callback: (data: BroadcastAlertEvent) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('admin:broadcast', callback);
    return () => {
      this.socket?.off('admin:broadcast', callback);
    };
  }

  public onConnect(callback: () => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('connect', callback);
    return () => {
      this.socket?.off('connect', callback);
    };
  }

  public onDisconnect(callback: () => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('disconnect', callback);
    return () => {
      this.socket?.off('disconnect', callback);
    };
  }
}

export const socketService = new AdminSocketService();
