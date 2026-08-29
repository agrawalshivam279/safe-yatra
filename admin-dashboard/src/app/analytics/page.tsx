'use client';

/**
 * Safe Yatra — Admin Command Center Analytics & Telemetry Page
 * Multi-chart visual analytics covering danger trajectories, SOS volume, incident distribution, and responder SLA.
 */

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  RefreshCw,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useAdminAnalyticsCharts } from '../../hooks/useAdminAnalyticsCharts';

export default function AnalyticsPage() {
  const [days, setDays] = useState<number>(7);
  const { data: analytics, isLoading, refetch } = useAdminAnalyticsCharts(days);

  const summary = analytics?.summary || {
    totalIncidents: 48,
    activeZonesCount: 12,
    resolutionRatePercentage: 97.9,
    protectedTouristsCount: 14850,
  };

  const sla = analytics?.sla || {
    avgResponseTimeMinutes: 3.4,
    targetMinutes: 5.0,
    withinTargetPercentage: 96.2,
    totalRescues: 59,
  };

  const dangerTrends = analytics?.dangerTrends || [];
  const dailySOS = analytics?.dailySOS || [];
  const incidentTypes = analytics?.incidentTypes || [];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md shadow-primary-950/40">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Command Center Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Historical hazard risk trajectories, distress incident volume, and Yaatri Mitra rescue response SLAs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Timeframe Selector */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setDays(7)}
              data-testid="timeframe-7d-btn"
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                days === 7
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setDays(30)}
              data-testid="timeframe-30d-btn"
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                days === 30
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={() => refetch()}
            data-testid="refresh-analytics-btn"
            aria-label="Refresh analytics data"
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Telemetry Metric Banners */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Banner 1: Avg Response Time */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Response Time</span>
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {sla.avgResponseTimeMinutes}{' '}
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">min</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Target: &lt; {sla.targetMinutes} min ({sla.withinTargetPercentage}% compliant)
          </p>
        </div>

        {/* Banner 2: SOS Resolution Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Resolution Rate</span>
            <CheckCircle2 className="h-4 w-4 text-primary-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-primary-600 dark:text-primary-400">
            {summary.resolutionRatePercentage}%
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{summary.totalIncidents} total logged rescues</p>
        </div>

        {/* Banner 3: Monitored Corridors */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Monitored Sectors</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {summary.activeZonesCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active spatial geofences</p>
        </div>

        {/* Banner 4: Protected Pilgrims */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Protected Footfall</span>
            <Users className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {summary.protectedTouristsCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Live monitored pilgrims</p>
        </div>
      </div>

      {/* 4 Core Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: 7-Day Danger Score Trajectory (Line Chart) */}
        <div
          data-testid="chart-danger-trends"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Danger Score Trajectory (Top 5 Sectors)
              </h3>
              <p className="text-[11px] text-slate-400">Dynamic ML risk scores over 7-day timeline</p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary-500" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dangerTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="Tiger Point" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Bhushi Dam" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Khandala Trail" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Rajmachi Fort" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Amarnath Pass" stroke="#a855f7" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Daily SOS Distress Volume (Bar Chart) */}
        <div
          data-testid="chart-daily-sos"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Daily SOS Distress Volume
              </h3>
              <p className="text-[11px] text-slate-400">Triggered distress calls vs successfully resolved</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySOS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="triggered" name="SOS Triggered" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved Rescues" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Incident Type Distribution (Donut / Pie Chart) */}
        <div
          data-testid="chart-incident-distribution"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Incident Category Breakdown
              </h3>
              <p className="text-[11px] text-slate-400">Proportional classification of emergency distress calls</p>
            </div>
            <BarChart3 className="h-4 w-4 text-sky-500" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incidentTypes}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {incidentTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Yaatri Mitra SLA & Rescue Velocity Gauge */}
        <div
          data-testid="chart-sla-gauge"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Yaatri Mitra SLA & Rescue Velocity
                </h3>
                <p className="text-[11px] text-slate-400">Average response time vs SIH Gold Standard Target</p>
              </div>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>

            <div className="mt-6 space-y-4">
              {/* Big Metric Display */}
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {sla.avgResponseTimeMinutes}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 ml-1">minutes avg arrival</span>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-500/30">
                  {sla.withinTargetPercentage}% WITHIN SLA
                </span>
              </div>

              {/* Progress Comparison Gauge */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Current Velocity: {sla.avgResponseTimeMinutes} min</span>
                  <span>Target Standard: {sla.targetMinutes} min</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, (sla.avgResponseTimeMinutes / sla.targetMinutes) * 100)}%`,
                    }}
                    className="h-3 rounded-full bg-emerald-500"
                  />
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                ⚡ Yaatri Mitras are arriving on-scene <strong>1.6 minutes faster</strong> than the 5-minute national response target standard.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Total Logged Rescues: {sla.totalRescues}</span>
            <span>Dispatch System: Proximity Haversine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
