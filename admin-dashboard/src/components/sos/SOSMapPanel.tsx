'use client';

/**
 * Safe Yatra — Admin Live SOS Tactical Map Panel
 * Displays active distress coordinates, responding Yaatri Mitras, trajectory, and live ETA calculations.
 */

import React from 'react';
import { SOSEvent } from '../../services/sosService';
import {
  AlertOctagon,
  Users,
  Navigation,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Phone,
  Battery,
  Layers,
} from 'lucide-react';

export interface SOSMapPanelProps {
  event: SOSEvent | null;
  onResolve?: (id: string) => void;
  isResolving?: boolean;
}

/**
 * Haversine formula distance calculation in meters.
 */
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function SOSMapPanel({
  event,
  onResolve,
  isResolving = false,
}: SOSMapPanelProps) {
  if (!event) {
    return (
      <div
        data-testid="sos-map-empty"
        className="flex h-full min-h-[500px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 p-8 text-center text-slate-400 dark:border-slate-800"
      >
        <ShieldCheck className="h-12 w-12 text-slate-700 mb-2" />
        <h3 className="text-sm font-bold text-slate-300">No Emergency Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Select an incoming distress signal from the queue to view real-time tactical dispatch telemetry and responder routes.
        </p>
      </div>
    );
  }

  const responder = event.responders && event.responders.length > 0 ? event.responders[0] : null;

  // Calculate distance and ETA if responder location exists
  let distanceMeters: number | null = null;
  let etaMinutes: number | null = null;

  if (responder?.location) {
    distanceMeters = calculateDistanceMeters(
      event.location.lat,
      event.location.lng,
      responder.location.lat,
      responder.location.lng
    );
    // Walking speed: 4.5 km/h = 75 m/min
    etaMinutes = Math.max(1, Math.ceil(distanceMeters / 75));
  }

  return (
    <div className="flex h-full min-h-[500px] flex-col rounded-2xl border border-slate-200 bg-slate-950 shadow-inner dark:border-slate-800 overflow-hidden">
      {/* Top Tactical Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 p-4 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <h3 className="text-sm font-bold text-white">
              Tactical Dispatch: {event.userName || `Tourist (${event.userId.slice(0, 8)})`}
            </h3>
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              {event.status}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Distress Origin: {event.location.lat.toFixed(4)}, {event.location.lng.toFixed(4)}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {event.status !== 'RESOLVED' && event.status !== 'CANCELLED' && onResolve && (
            <button
              type="button"
              onClick={() => onResolve(event.id)}
              disabled={isResolving}
              data-testid="resolve-sos-btn"
              className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Mark Resolved</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tactical Map Viewport */}
      <div
        data-testid="sos-tactical-map"
        className="relative flex-1 p-8 flex items-center justify-center overflow-hidden"
      >
        {/* Tactical Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

        {/* Live Distance & ETA Banner */}
        {distanceMeters !== null && etaMinutes !== null && (
          <div
            data-testid="eta-banner"
            className="absolute top-4 left-4 z-10 flex items-center space-x-3 rounded-xl border border-sky-800/80 bg-sky-950/80 p-3 shadow-xl backdrop-blur-md text-xs text-sky-200"
          >
            <Clock className="h-4 w-4 text-sky-400 shrink-0" />
            <div>
              <span className="font-bold text-white">{etaMinutes} min away</span>
              <span className="text-sky-300 ml-1.5 font-mono">({distanceMeters}m walking distance)</span>
            </div>
          </div>
        )}

        {/* Tactical Canvas Representation */}
        <div className="relative flex flex-col md:flex-row items-center justify-center gap-12 z-10 w-full max-w-xl">
          {/* 1. Tourist Distress Beacon */}
          <div
            data-testid="tourist-beacon"
            className="relative flex flex-col items-center justify-center text-center p-4 rounded-2xl border-2 border-rose-500 bg-rose-500/20 shadow-2xl backdrop-blur-md"
          >
            <div className="absolute -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg animate-pulse">
              <AlertOctagon className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-white mt-1">
              {event.userName || 'Distress Tourist'}
            </h4>
            <p className="text-[10px] text-rose-300 font-mono mt-0.5">
              {event.location.lat.toFixed(4)}, {event.location.lng.toFixed(4)}
            </p>
            {event.batteryLevel !== undefined && (
              <span className="mt-2 inline-flex items-center space-x-1 rounded-md bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                <Battery className="h-3 w-3" />
                <span>{event.batteryLevel}% Battery</span>
              </span>
            )}
          </div>

          {/* Trajectory Connector */}
          {responder && (
            <div className="flex flex-col items-center justify-center text-sky-400">
              <Navigation className="h-6 w-6 rotate-90 md:rotate-0 animate-bounce" />
              <span className="text-[10px] font-mono mt-1 text-sky-300">
                {distanceMeters}m
              </span>
            </div>
          )}

          {/* 2. Responding Yaatri Mitra Beacon */}
          {responder ? (
            <div
              data-testid="responder-beacon"
              className="relative flex flex-col items-center justify-center text-center p-4 rounded-2xl border-2 border-sky-500 bg-sky-500/20 shadow-2xl backdrop-blur-md"
            >
              <div className="absolute -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg">
                <Users className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold text-white mt-1">
                {responder.name}
              </h4>
              <p className="text-[10px] text-sky-300 font-mono mt-0.5">
                {responder.location
                  ? `${responder.location.lat.toFixed(4)}, ${responder.location.lng.toFixed(4)}`
                  : 'Location syncing...'}
              </p>
              <span className="mt-2 inline-flex items-center space-x-1 rounded-md bg-sky-950 px-2 py-0.5 text-[10px] font-bold text-sky-300 uppercase">
                {responder.status}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center text-slate-500">
              <Users className="h-8 w-8 opacity-40 mb-1" />
              <span className="text-xs font-semibold">Broadcasting to nearby Yaatri Mitras...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
