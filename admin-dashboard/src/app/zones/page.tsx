'use client';

/**
 * Safe Yatra — Admin Hazard Zone Registry Page
 * Data table listing all monitored pilgrimage sectors, danger scores, manual overrides, and geofences.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  SlidersHorizontal,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { useAdminZonesList } from '../../hooks/useAdminZones';

type SeverityFilter = 'ALL' | 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'LOW';

const tierBadgeStyles = {
  CRITICAL: 'bg-rose-600 text-white',
  SEVERE: 'bg-orange-600 text-white',
  MODERATE: 'bg-amber-500 text-slate-950',
  LOW: 'bg-emerald-600 text-white',
};

export default function ZonesListPage() {
  const { data: zonesData, isLoading, refetch } = useAdminZonesList();
  const [search, setSearch] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<SeverityFilter>('ALL');

  const zones = zonesData || [];

  const filteredZones = zones.filter((zone) => {
    // Tier filter
    if (tierFilter !== 'ALL' && zone.tier !== tierFilter) {
      return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = zone.name.toLowerCase();
      const matchId = zone.id.toLowerCase();
      return matchName.includes(q) || matchId.includes(q);
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md shadow-orange-950/40">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Hazard Zone Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure dynamic ML danger thresholds, execute manual score overrides, and provision geofence boundaries.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            data-testid="refresh-zones-btn"
            aria-label="Refresh zone list"
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/zones/create"
            data-testid="create-zone-btn"
            className="inline-flex items-center space-x-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-primary-950/30 hover:bg-primary-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Provision Geofence</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sector name, ID..."
            data-testid="search-zones-input"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center space-x-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Tier:</span>
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

      {/* Zone Registry Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Sector Name & Coordinates</th>
                <th className="py-3.5 px-4">Severity Tier</th>
                <th className="py-3.5 px-4">Danger Score</th>
                <th className="py-3.5 px-4">Mode / Override Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredZones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No monitored zones matched the search criteria.
                  </td>
                </tr>
              ) : (
                filteredZones.map((zone) => (
                  <tr
                    key={zone.id}
                    data-testid={`zone-row-${zone.id}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Name & Coords */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {zone.name}
                      </div>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>
                          {zone.coordinates.lat.toFixed(4)}, {zone.coordinates.lng.toFixed(4)}
                        </span>
                      </div>
                    </td>

                    {/* Tier Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          tierBadgeStyles[zone.tier] || tierBadgeStyles.LOW
                        }`}
                      >
                        {zone.tier}
                      </span>
                    </td>

                    {/* Danger Score Gauge */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {zone.dangerScore}
                        </span>
                        <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${zone.dangerScore}%` }}
                            className={`h-full ${
                              zone.dangerScore >= 76
                                ? 'bg-rose-500'
                                : zone.dangerScore >= 51
                                ? 'bg-orange-500'
                                : zone.dangerScore >= 26
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Override Status */}
                    <td className="py-3.5 px-4">
                      {zone.isManualOverride ? (
                        <span className="inline-flex items-center space-x-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-bold text-purple-600 border border-purple-500/30 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                          <SlidersHorizontal className="h-3 w-3" />
                          <span>MANUAL OVERRIDE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <Sparkles className="h-3 w-3 text-primary-500" />
                          <span>AI Computed</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/zones/${zone.id}`}
                        data-testid={`inspect-zone-${zone.id}`}
                        className="inline-flex items-center space-x-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-primary-50 hover:text-primary-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-primary-950/60 dark:hover:text-primary-400 transition-colors"
                      >
                        <span>Inspect / Override</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
