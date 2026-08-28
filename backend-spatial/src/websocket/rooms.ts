/**
 * Safe Yatra — Backend Spatial Server
 * WebSocket Room Management & Broadcasting Utilities.
 */

import { Server as SocketIOServer } from 'socket.io';

export const userRoom = (userId: string): string => `user:${userId}`;
export const roleRoom = (role: string): string => `role:${role}`;
export const zoneRoom = (zoneId: string): string => `zone:${zoneId}`;

/**
 * Emits an event to a specific authenticated user.
 */
export const emitToUser = (
  io: SocketIOServer,
  userId: string,
  event: string,
  payload: unknown
): void => {
  io.to(userRoom(userId)).emit(event, payload);
};

/**
 * Emits an event to all users with a specific role (e.g. YAATRI_MITRA, ADMIN).
 */
export const emitToRole = (
  io: SocketIOServer,
  role: string,
  event: string,
  payload: unknown
): void => {
  io.to(roleRoom(role)).emit(event, payload);
};

/**
 * Emits an event to all users currently subscribed to a specific geographic zone.
 */
export const emitToZone = (
  io: SocketIOServer,
  zoneId: string,
  event: string,
  payload: unknown
): void => {
  io.to(zoneRoom(zoneId)).emit(event, payload);
};

/**
 * Broadcasts an event to all connected clients.
 */
export const emitToAll = (
  io: SocketIOServer,
  event: string,
  payload: unknown
): void => {
  io.emit(event, payload);
};
