'use client';

/**
 * Safe Yatra — Admin Zone Detail & Manual Score Override Inspector
 * Displays 4-factor risk breakdown, AI justification, and manual danger score override slider.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAdminZoneDetail } from '../../../hooks/useAdminZones';
import { zoneAdminService } from '../../../services/zoneAdminService';
import { useQueryClient } from '@tanstack/react-query';
import { ADMIN_ZONES_QUERY_KEY } from '../../../hooks/useAdminZones';

export default function ZoneDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: zone, isLoading, error, refetch } = useAdminZoneDetail(params.id);

  const [overrideScore, setOverrideScore] = useState<number>(50);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync initial slider score with current danger score
  useEffect(() => {
    if (zone) {
      setOverrideScore(zone.dangerScore);
      if (zone.overrideReason) {
        setReason(zone.overrideReason);
      }
    }
  }, [zone]);

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!reason.trim()) {
      setFeedback({
        type: 'error',
        text: 'An operational reason is required to log a manual score override.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await zoneAdminService.overrideZoneScore(params.id, {
        dangerScore: overrideScore,
        reason: reason.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_ZONES_QUERY_KEY });
      setFeedback({
        type: 'success',
        text: `Successfully applied manual override: Danger Score set to ${overrideScore}/100. Socket.IO alerts dispatched nationwide.`,
      });
      refetch();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to apply danger score override.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
          <span className="text-xs font-semibold">Loading zone telemetry...</span>
        </div>
      </div>
    );
  }

  if (error || !zone) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
        <h3 className="font-bold text-sm">Zone Not Found</h3>
        <p className="text-xs mt-1">Unable to locate sector ID: {params.id}</p>
        <Link
          href="/zones"
          className="mt-3 inline-flex items-center space-x-1 text-xs font-bold text-primary-600 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Zone Registry</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/zones"
            className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-primary-600 dark:text-slate-400 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Zone Registry</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {zone.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                zone.tier === 'CRITICAL'
                  ? 'bg-rose-600 text-white'
                  : zone.tier === 'SEVERE'
                  ? 'bg-orange-600 text-white'
                  : zone.tier === 'MODERATE'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {zone.tier}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono mt-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {zone.coordinates.lat.toFixed(4)}, {zone.coordinates.lng.toFixed(4)}
            </span>
            <span>•</span>
            <span>ID: {zone.id}</span>
          </div>
        </div>

        {zone.isManualOverride && (
          <span className="inline-flex items-center space-x-1.5 rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-600 border border-purple-500/30 dark:bg-purple-950 dark:text-purple-300">
            <SlidersHorizontal className="h-4 w-4" />
            <span>MANUAL OVERRIDE ACTIVE</span>
          </span>
        )}
      </div>

      {/* Grid: 4 Factors + AI Assessment */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Card 1: 4-Factor Sub-Risk Telemetry */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Dynamic Risk Sub-Model Scores
            </h3>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Total Score: {zone.dangerScore}/100
            </span>
          </div>

          {zone.factors ? (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                  <span>🌧️ Meteorological & Rainfall Risk (35%)</span>
                  <strong>{zone.factors.weather.score}/100</strong>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    style={{ width: `${zone.factors.weather.score}%` }}
                    className="h-2 rounded-full bg-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                  <span>⛰️ Terrain Slope & Proximity Hazard (20%)</span>
                  <strong>{zone.factors.terrain.score}/100</strong>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    style={{ width: `${zone.factors.terrain.score}%` }}
                    className="h-2 rounded-full bg-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                  <span>👥 Live Footfall Density Risk (25%)</span>
                  <strong>{zone.factors.crowd.score}/100</strong>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    style={{ width: `${zone.factors.crowd.score}%` }}
                    className="h-2 rounded-full bg-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                  <span>📜 Historical Incident Multiplier (20%)</span>
                  <strong>{zone.factors.history.score}/100</strong>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    style={{ width: `${zone.factors.history.score}%` }}
                    className="h-2 rounded-full bg-rose-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No sub-factor breakdown available.</p>
          )}
        </div>

        {/* Card 2: AI Hazard Justification */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Sparkles className="h-4 w-4 text-primary-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                AI Assessment & Field Memo
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mt-3">
              {zone.justification ||
                'Automated multi-factor risk assessment computed from meteorological radar, elevation topography, crowd density estimation, and past incident telemetry.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Model Engine: SafeYatra-ML v1.0</span>
            <span>Refreshed: Real-time</span>
          </div>
        </div>
      </div>

      {/* Manual Danger Score Override Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 dark:border-slate-800 mb-5">
          <SlidersHorizontal className="h-5 w-5 text-primary-500" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Emergency Danger Score Override
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Commanders can manually override the calculated risk score during unforeseen on-ground incidents.
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            data-testid="override-feedback-alert"
            className={`mb-5 flex items-start space-x-2.5 rounded-lg p-3 text-xs ${
              feedback.type === 'success'
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                : 'border border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleApplyOverride} className="space-y-5">
          {/* Slider Control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="override-slider" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Adjusted Danger Score
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {overrideScore}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white ${
                    overrideScore >= 76
                      ? 'bg-rose-600'
                      : overrideScore >= 51
                      ? 'bg-orange-600'
                      : overrideScore >= 26
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                >
                  {overrideScore >= 76
                    ? 'CRITICAL'
                    : overrideScore >= 51
                    ? 'SEVERE'
                    : overrideScore >= 26
                    ? 'MODERATE'
                    : 'LOW'}
                </span>
              </div>
            </div>

            <input
              id="override-slider"
              type="range"
              min="0"
              max="100"
              value={overrideScore}
              onChange={(e) => setOverrideScore(Number(e.target.value))}
              data-testid="danger-score-slider"
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-primary-600 dark:bg-slate-700"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0 (Safe)</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100 (Critical)</span>
            </div>
          </div>

          {/* Reason Text Area */}
          <div>
            <label htmlFor="override-reason" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Operational Justification Memo (Required)
            </label>
            <textarea
              id="override-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Flash landslide observed near ravine trail; emergency closure enacted."
              data-testid="override-reason-input"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="apply-override-btn"
            className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-primary-950/30 hover:bg-primary-500 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Applying Override...</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="h-4 w-4" />
                <span>Apply Score Override</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
