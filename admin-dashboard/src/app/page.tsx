'use client';

/**
 * Safe Yatra — Admin Command Center Dashboard Overview
 * Primary situational awareness dashboard displaying live KPI telemetry, hazard distributions, and operational alerts.
 */

import React from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  Users,
  ShieldAlert,
  HeartHandshake,
  Activity,
  Radio,
  Map,
  BarChart3,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics';
import { KPICard } from '../components/analytics/KPICard';

export default function DashboardHome() {
  const { data, isLoading, isError, refetch } = useAdminAnalytics();

  // Compute operational readiness level
  const hasActiveSOS = (data?.activeSosCount || 0) > 0;
  const hasCriticalZones = (data?.criticalZones || 0) > 0;
  const hasSevereZones = (data?.severeZones || 0) > 0;

  const totalZones =
    (data?.criticalZones || 0) +
    (data?.severeZones || 0) +
    (data?.moderateZones || 0) +
    (data?.lowZones || 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Command Center Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time proactive safety monitoring, pilgrimage tracking, and emergency response telemetry.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          data-testid="refresh-analytics-btn"
          aria-label="Refresh telemetry data"
          className="inline-flex items-center space-x-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Operational Readiness Hero Banner */}
      <div
        data-testid="operational-status-banner"
        className={`rounded-xl border p-4 shadow-sm transition-colors ${
          hasActiveSOS
            ? 'border-rose-300 bg-rose-50/80 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
            : hasCriticalZones || hasSevereZones
            ? 'border-amber-300 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
            : 'border-emerald-300 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
        }`}
      >
        <div className="flex items-center space-x-3">
          {hasActiveSOS ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white shadow-md shadow-rose-950/30 animate-pulse">
              <AlertOctagon className="h-6 w-6" />
            </div>
          ) : hasCriticalZones || hasSevereZones ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white shadow-md shadow-amber-950/30">
              <AlertTriangle className="h-6 w-6" />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-950/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold tracking-tight">
              {hasActiveSOS
                ? `CRITICAL STATE: ${data?.activeSosCount} Active Emergency SOS Signal(s)`
                : hasCriticalZones || hasSevereZones
                ? `ELEVATED CAUTION: ${data?.criticalZones || 0} Critical & ${data?.severeZones || 0} Severe Hazards Monitored`
                : 'NORMAL OPERATIONS: All Monitored Pilgrim & Trekking Corridors Stable'}
            </h2>
            <p className="text-xs opacity-90 mt-0.5 truncate">
              {hasActiveSOS
                ? 'Immediate field responder intervention required. Dispatchers monitoring Yaatri Mitra positions.'
                : 'Automated ML risk models computing multi-factor hazard scores across active pilgrimage circuits.'}
            </p>
          </div>

          {data?.avgResponseTimeMinutes !== undefined && (
            <div className="hidden md:flex items-center space-x-1.5 rounded-md bg-white/60 dark:bg-slate-900/60 px-3 py-1.5 text-xs font-semibold">
              <Clock className="h-3.5 w-3.5 opacity-70" />
              <span>Avg Response: {data.avgResponseTimeMinutes.toFixed(1)} min</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary 4 KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Active SOS */}
        <KPICard
          title="Active SOS Alerts"
          value={data?.activeSosCount ?? 0}
          icon={AlertOctagon}
          badge={{
            text: (data?.activeSosCount || 0) > 0 ? `${data?.activeSosCount} ACTIVE` : 'ALL CLEAR',
            variant: (data?.activeSosCount || 0) > 0 ? 'critical' : 'success',
          }}
          subtitle={
            (data?.totalSosCount || 0) > 0
              ? `${data?.resolvedSosCount || 0} resolved of ${data?.totalSosCount || 0} total`
              : 'Zero distress signals'
          }
          isLoading={isLoading}
          href="/sos"
        />

        {/* KPI 2: Active Monitored Tourists */}
        <KPICard
          title="Monitored Tourists"
          value={data?.activeTourists ?? 0}
          icon={Users}
          badge={{ text: 'LIVE GPS', variant: 'info' }}
          subtitle="Real-time footfall across pilgrim sectors"
          isLoading={isLoading}
          href="/heatmap"
        />

        {/* KPI 3: On-Duty Yaatri Mitras */}
        <KPICard
          title="On-Duty Mitras"
          value={`${data?.onDutyMitras ?? 0} / ${data?.totalVolunteers ?? 0}`}
          icon={HeartHandshake}
          badge={{
            text: `${Math.round(
              ((data?.onDutyMitras || 0) / Math.max(1, data?.totalVolunteers || 1)) * 100
            )}% READY`,
            variant: 'success',
          }}
          subtitle="Field rescue volunteers on active duty"
          isLoading={isLoading}
          href="/volunteers"
        />

        {/* KPI 4: Critical Hazard Zones */}
        <KPICard
          title="High-Risk Sectors"
          value={(data?.criticalZones || 0) + (data?.severeZones || 0)}
          icon={ShieldAlert}
          badge={{
            text: (data?.criticalZones || 0) > 0 ? `${data?.criticalZones} CRITICAL` : 'MODERATE',
            variant: (data?.criticalZones || 0) > 0 ? 'critical' : 'warning',
          }}
          subtitle={`${data?.criticalZones || 0} Critical • ${data?.severeZones || 0} Severe zones`}
          isLoading={isLoading}
          href="/zones"
        />
      </div>

      {/* Sector Hazard Distribution Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Monitored Sector Hazard Distribution
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {totalZones} Total Monitored Zones
          </span>
        </div>

        {/* Proportional Progress Bar */}
        <div
          data-testid="hazard-distribution-bar"
          className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div
            style={{ width: `${totalZones > 0 ? ((data?.criticalZones || 0) / totalZones) * 100 : 0}%` }}
            className="bg-rose-500 transition-all"
            title={`Critical: ${data?.criticalZones || 0}`}
          />
          <div
            style={{ width: `${totalZones > 0 ? ((data?.severeZones || 0) / totalZones) * 100 : 0}%` }}
            className="bg-orange-500 transition-all"
            title={`Severe: ${data?.severeZones || 0}`}
          />
          <div
            style={{ width: `${totalZones > 0 ? ((data?.moderateZones || 0) / totalZones) * 100 : 0}%` }}
            className="bg-amber-400 transition-all"
            title={`Moderate: ${data?.moderateZones || 0}`}
          />
          <div
            style={{ width: `${totalZones > 0 ? ((data?.lowZones || 0) / totalZones) * 100 : 100}%` }}
            className="bg-emerald-500 transition-all"
            title={`Low: ${data?.lowZones || 0}`}
          />
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
            <span className="text-slate-600 dark:text-slate-300">
              Critical: <strong>{data?.criticalZones ?? 0}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
            <span className="text-slate-600 dark:text-slate-300">
              Severe: <strong>{data?.severeZones ?? 0}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
            <span className="text-slate-600 dark:text-slate-300">
              Moderate: <strong>{data?.moderateZones ?? 0}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-600 dark:text-slate-300">
              Low: <strong>{data?.lowZones ?? 0}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Dispatch & Operations Grid */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Command Center Operations
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/sos"
            className="flex items-center space-x-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Live SOS Queue
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Track distress & dispatchers
              </p>
            </div>
          </Link>

          <Link
            href="/heatmap"
            className="flex items-center space-x-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <Map className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Macro Heatmap
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Density & hazard polygons
              </p>
            </div>
          </Link>

          <Link
            href="/broadcast"
            className="flex items-center space-x-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Broadcast Alert
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Push warnings to sector
              </p>
            </div>
          </Link>

          <Link
            href="/analytics"
            className="flex items-center space-x-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Safety Trends
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Risk & incident metrics
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
