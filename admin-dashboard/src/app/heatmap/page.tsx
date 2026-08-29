'use client';

/**
 * Safe Yatra — Admin Macro Heatmap Page
 * Interactive macro-level map combining tourist footfall density and PostGIS danger polygons.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Map as MapIcon,
  Layers,
  Filter,
  Eye,
  EyeOff,
  Flame,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useHeatmapClusters, useZones } from '../../hooks/useHeatmapData';
import { HeatmapMap } from '../../components/maps/HeatmapMap';
import { ZoneData } from '../../services/mapService';

type SeverityFilter = 'ALL' | 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'LOW';

export default function MacroHeatmapPage() {
  const { data: heatmapData, isLoading: isHeatmapLoading, refetch: refetchHeatmap } = useHeatmapClusters();
  const { data: zonesData, isLoading: isZonesLoading, refetch: refetchZones } = useZones();

  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [tierFilter, setTierFilter] = useState<SeverityFilter>('ALL');
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);

  const zones = zonesData || [];
  const clusters = heatmapData?.clusters || [];

  // Filter zones by severity tier
  const filteredZones = zones.filter((zone) => {
    if (tierFilter === 'ALL') return true;
    return zone.tier === tierFilter;
  });

  const handleRefresh = () => {
    refetchHeatmap();
    refetchZones();
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl flex items-center space-x-2.5">
            <MapIcon className="h-7 w-7 text-primary-500" />
            <span>Macro Heatmap & Hazard Polygons</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time geospatial visualization of tourist footfall clusters and PostGIS danger hazard boundaries.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          data-testid="refresh-map-btn"
          aria-label="Refresh map data"
          className="inline-flex items-center space-x-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isHeatmapLoading || isZonesLoading ? 'animate-spin' : ''}`}
          />
          <span>Refresh Spatial Data</span>
        </button>
      </div>

      {/* Map Controls & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Layer Visibility Switches */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center space-x-1">
            <Layers className="h-3.5 w-3.5" />
            <span>Layers:</span>
          </span>

          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            data-testid="toggle-heatmap-btn"
            className={`inline-flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              showHeatmap
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-950/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Footfall Heatmap</span>
            {showHeatmap ? <Eye className="h-3 w-3 ml-0.5" /> : <EyeOff className="h-3 w-3 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowZones(!showZones)}
            data-testid="toggle-zones-btn"
            className={`inline-flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              showZones
                ? 'bg-rose-600 text-white font-bold shadow-sm shadow-rose-950/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Hazard Polygons</span>
            {showZones ? <Eye className="h-3 w-3 ml-0.5" /> : <EyeOff className="h-3 w-3 ml-0.5" />}
          </button>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center space-x-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter:</span>
          </span>

          {(['ALL', 'CRITICAL', 'SEVERE', 'MODERATE', 'LOW'] as SeverityFilter[]).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              data-testid={`filter-${tier.toLowerCase()}-btn`}
              className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                tierFilter === tier
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map & Intelligence Drawer Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 min-h-[560px]">
        {/* Left 2 Cols: Interactive Map Canvas */}
        <div className="lg:col-span-2 h-[560px]">
          <HeatmapMap
            clusters={clusters}
            zones={filteredZones}
            showHeatmap={showHeatmap}
            showZones={showZones}
            selectedZoneId={selectedZone?.id || null}
            onSelectZone={(zone) => setSelectedZone(zone)}
            isLoading={isHeatmapLoading || isZonesLoading}
          />
        </div>

        {/* Right 1 Col: Selected Zone Intelligence Drawer */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-[560px]">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-primary-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Sector Risk Inspector
              </h2>
            </div>
            {selectedZone && (
              <span className="text-[11px] font-mono text-slate-400">
                ID: {selectedZone.id}
              </span>
            )}
          </div>

          {selectedZone ? (
            <div
              data-testid="selected-zone-inspector"
              className="flex-1 overflow-y-auto pt-4 space-y-4"
            >
              {/* Title & Score Hero */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedZone.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Lat: {selectedZone.coordinates.lat.toFixed(4)}, Lng:{' '}
                    {selectedZone.coordinates.lng.toFixed(4)}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedZone.tier === 'CRITICAL'
                        ? 'bg-rose-600 text-white'
                        : selectedZone.tier === 'SEVERE'
                        ? 'bg-orange-600 text-white'
                        : selectedZone.tier === 'MODERATE'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {selectedZone.tier}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 mt-1">
                    Score: <strong>{selectedZone.dangerScore}</strong>/100
                  </span>
                </div>
              </div>

              {/* 4-Factor Risk Breakdown */}
              {selectedZone.factors && (
                <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Dynamic Sub-Risk Factors
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-0.5">
                        <span>🌧️ Weather (35%)</span>
                        <strong>{selectedZone.factors.weather.score}/100</strong>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          style={{ width: `${selectedZone.factors.weather.score}%` }}
                          className="h-1.5 rounded-full bg-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-0.5">
                        <span>⛰️ Terrain (20%)</span>
                        <strong>{selectedZone.factors.terrain.score}/100</strong>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          style={{ width: `${selectedZone.factors.terrain.score}%` }}
                          className="h-1.5 rounded-full bg-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-0.5">
                        <span>👥 Crowd Footfall (25%)</span>
                        <strong>{selectedZone.factors.crowd.score}/100</strong>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          style={{ width: `${selectedZone.factors.crowd.score}%` }}
                          className="h-1.5 rounded-full bg-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-0.5">
                        <span>📜 Historical Incidents (20%)</span>
                        <strong>{selectedZone.factors.history.score}/100</strong>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          style={{ width: `${selectedZone.factors.history.score}%` }}
                          className="h-1.5 rounded-full bg-rose-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Justification Briefing */}
              {selectedZone.justification && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    AI Hazard Assessment
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {selectedZone.justification}
                  </p>
                </div>
              )}

              {/* Action Link */}
              <div className="pt-2">
                <Link
                  href={`/zones/${selectedZone.id}`}
                  className="inline-flex w-full items-center justify-center space-x-1.5 rounded-lg bg-primary-600 py-2.5 px-3 text-xs font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
                >
                  <span>Manage Zone & Override Score</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShieldAlert className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-medium">
                Click any hazard polygon or density cluster on the map to inspect live multi-factor telemetry.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
