'use client';

/**
 * Safe Yatra — Admin Dashboard Interactive Heatmap & Zone Map
 * Renders tourist GPS density clusters and PostGIS danger hazard polygons.
 */

import React from 'react';
import { HeatmapCluster, ZoneData } from '../../services/mapService';
import { Users, ShieldAlert, Layers, ZoomIn, ZoomOut } from 'lucide-react';

export interface HeatmapMapProps {
  clusters: HeatmapCluster[];
  zones: ZoneData[];
  showHeatmap: boolean;
  showZones: boolean;
  selectedZoneId: string | null;
  onSelectZone: (zone: ZoneData) => void;
  isLoading?: boolean;
}

const tierStyles = {
  CRITICAL: {
    bg: 'bg-rose-500/30',
    border: 'border-rose-600',
    text: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-600 text-white',
  },
  SEVERE: {
    bg: 'bg-orange-500/30',
    border: 'border-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-600 text-white',
  },
  MODERATE: {
    bg: 'bg-amber-500/30',
    border: 'border-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500 text-slate-900',
  },
  LOW: {
    bg: 'bg-emerald-500/30',
    border: 'border-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-600 text-white',
  },
};

export function HeatmapMap({
  clusters,
  zones,
  showHeatmap,
  showZones,
  selectedZoneId,
  onSelectZone,
  isLoading = false,
}: HeatmapMapProps) {
  return (
    <div
      data-testid="heatmap-map-container"
      className="relative h-full min-h-[500px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-inner dark:border-slate-800"
    >
      {/* Map Canvas Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

      {/* Map Controls Header Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 rounded-lg border border-slate-800 bg-slate-900/80 p-2 shadow-lg backdrop-blur-md text-xs text-slate-300">
        <Layers className="h-4 w-4 text-primary-400" />
        <span className="font-semibold">Sector: Lonavala Pilot Circuit</span>
        <span className="text-slate-500">•</span>
        <span>{zones.length} Zones</span>
        <span className="text-slate-500">•</span>
        <span>{clusters.length} Footfall Density Clusters</span>
      </div>

      {/* Map Zoom Controls (Visual UI) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-1 shadow-lg backdrop-blur-md">
        <button
          type="button"
          aria-label="Zoom in"
          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>

      {/* Map Visualization Stage */}
      <div className="relative h-full w-full p-8 flex flex-wrap items-center justify-center gap-6 overflow-auto">
        {/* Render Danger Hazard Zones */}
        {showZones &&
          zones.map((zone, idx) => {
            const style = tierStyles[zone.tier] || tierStyles.LOW;
            const isSelected = selectedZoneId === zone.id;

            return (
              <div
                key={zone.id || idx}
                data-testid={`zone-polygon-${zone.id}`}
                onClick={() => onSelectZone(zone)}
                className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer select-none backdrop-blur-sm ${
                  style.bg
                } ${style.border} ${
                  isSelected
                    ? 'ring-4 ring-white/60 scale-105 shadow-2xl z-20'
                    : 'hover:scale-102 hover:shadow-lg'
                }`}
                style={{
                  minWidth: '170px',
                  minHeight: '130px',
                }}
              >
                {/* Zone Hazard Tier Badge */}
                <div className="flex items-center space-x-1.5 mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.badge}`}
                  >
                    {zone.tier}
                  </span>
                  <span className="text-xs font-bold text-white">
                    Score: {zone.dangerScore}
                  </span>
                </div>

                {/* Zone Name */}
                <h4 className="text-sm font-bold text-white text-center tracking-tight">
                  {zone.name}
                </h4>

                {/* Coordinates Subtext */}
                <p className="text-[10px] text-slate-300 font-mono mt-1">
                  {zone.coordinates.lat.toFixed(4)}, {zone.coordinates.lng.toFixed(4)}
                </p>

                {/* Selected Indicator */}
                {isSelected && (
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-950 text-[10px] font-bold shadow-md">
                    ✓
                  </span>
                )}
              </div>
            );
          })}

        {/* Render Tourist Footfall Density Clusters */}
        {showHeatmap &&
          clusters.map((cluster, idx) => {
            const intensityScale = Math.min(Math.max(cluster.intensity, 0.2), 1.0);
            const sizePx = 36 + intensityScale * 30;

            return (
              <div
                key={`cluster-${idx}`}
                data-testid="heatmap-cluster-point"
                title={`Density: ${cluster.count} tourists (${Math.round(cluster.intensity * 100)}% intensity)`}
                className="relative flex items-center justify-center group cursor-pointer"
                style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
              >
                {/* Outer Glow Halo */}
                <div
                  className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping pointer-events-none"
                  style={{ animationDuration: '3s' }}
                />

                {/* Middle Density Circle */}
                <div
                  className="absolute inset-1 rounded-full bg-amber-500/40 blur-[2px] transition-all group-hover:bg-amber-400/60"
                />

                {/* Core Point */}
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 border-2 border-white shadow-lg text-[11px] font-extrabold text-slate-950">
                  {cluster.count}
                </div>
              </div>
            );
          })}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div
          data-testid="map-loading-overlay"
          className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm z-30"
        >
          <div className="flex items-center space-x-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl">
            <span className="h-2 w-2 rounded-full bg-primary-400 animate-ping" />
            <span>Rendering spatial map layers...</span>
          </div>
        </div>
      )}
    </div>
  );
}
