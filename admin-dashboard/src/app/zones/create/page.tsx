'use client';

/**
 * Safe Yatra — Admin Geofence Sector Provisioning Page
 * Allows safety officers to register new monitored pilgrimage and hazard sectors.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  MapPin,
  ShieldAlert,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { zoneAdminService } from '../../../services/zoneAdminService';
import { useQueryClient } from '@tanstack/react-query';
import { ADMIN_ZONES_QUERY_KEY } from '../../../hooks/useAdminZones';

export default function CreateZonePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [lat, setLat] = useState<string>('18.7546');
  const [lng, setLng] = useState<string>('73.4062');
  const [severity, setSeverity] = useState<'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL'>('MODERATE');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (!name.trim()) {
      setError('Sector name is required.');
      return;
    }
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setError('Valid latitude and longitude coordinates are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await zoneAdminService.createZone({
        name: name.trim(),
        description: description.trim(),
        coordinates: {
          lat: parsedLat,
          lng: parsedLng,
        },
        severity,
      });

      queryClient.invalidateQueries({ queryKey: ADMIN_ZONES_QUERY_KEY });
      router.push('/zones');
    } catch (err: any) {
      setError(err.message || 'Failed to provision new geofenced hazard zone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/zones"
          className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-primary-600 dark:text-slate-400 transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Zone Registry</span>
        </Link>
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md shadow-primary-950/40">
            <Plus className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Provision Monitored Geofence
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Register a new spatial boundary polygon for multi-factor risk scoring and geofence alerts.
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {error && (
          <div
            role="alert"
            data-testid="create-zone-error"
            className="mb-5 flex items-start space-x-2.5 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sector Name */}
          <div>
            <label htmlFor="sector-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Sector / Site Name
            </label>
            <input
              id="sector-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Khandala Sunset Point Ravine"
              data-testid="zone-name-input"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="sector-desc" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Operational Description
            </label>
            <textarea
              id="sector-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description of terrain, pilgrimage access trail, or seasonal weather hazards..."
              data-testid="zone-desc-input"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Coordinates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sector-lat" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Center Latitude
              </label>
              <input
                id="sector-lat"
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="18.7546"
                data-testid="zone-lat-input"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="sector-lng" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Center Longitude
              </label>
              <input
                id="sector-lng"
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="73.4062"
                data-testid="zone-lng-input"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Initial Severity Tier */}
          <div>
            <label htmlFor="sector-tier" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Initial Hazard Severity Tier
            </label>
            <select
              id="sector-tier"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              data-testid="zone-tier-select"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="LOW">LOW — Safe for Travel (Score: 0-25)</option>
              <option value="MODERATE">MODERATE — Exercise Awareness (Score: 26-50)</option>
              <option value="SEVERE">SEVERE — High Hazard (Score: 51-75)</option>
              <option value="CRITICAL">CRITICAL — Do Not Enter (Score: 76-100)</option>
            </select>
          </div>

          {/* Submit Action */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="submit-create-zone-btn"
              className="inline-flex w-full items-center justify-center space-x-2 rounded-lg bg-primary-600 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-primary-950/30 hover:bg-primary-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Registering Spatial Geofence...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Provision Geofenced Sector</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
