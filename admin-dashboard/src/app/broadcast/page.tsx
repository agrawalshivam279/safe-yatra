'use client';

/**
 * Safe Yatra — Admin Emergency Broadcast Alert Composer
 * 3-step guided alert composition with interactive smartphone push notification simulator.
 */

import React, { useState } from 'react';
import {
  Radio,
  Send,
  AlertTriangle,
  AlertOctagon,
  Info,
  Smartphone,
  CheckCircle2,
  Clock,
  MapPin,
  Loader2,
  Bell,
  Sparkles,
} from 'lucide-react';
import { broadcastService, BroadcastResult } from '../../services/broadcastService';
import { useAdminZonesList } from '../../hooks/useAdminZones';

export default function BroadcastComposerPage() {
  const { data: zones } = useAdminZonesList();

  const [title, setTitle] = useState<string>('Sudden Flash Flood Evacuation Advisory');
  const [message, setMessage] = useState<string>(
    'Heavy upstream rainfall has caused rapid water level rise near waterfall cascades. Evacuate trail steps immediately.'
  );
  const [severity, setSeverity] = useState<'INFO' | 'WARNING' | 'EMERGENCY'>('EMERGENCY');
  const [zoneId, setZoneId] = useState<string>('');
  const [expiryHours, setExpiryHours] = useState<number>(4);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<BroadcastResult | null>(null);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setReceipt(null);

    if (!title.trim()) {
      setError('Alert headline title is required.');
      return;
    }
    if (!message.trim()) {
      setError('Emergency guidance message is required.');
      return;
    }

    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

    setIsSubmitting(true);
    try {
      const result = await broadcastService.sendBroadcast({
        title: title.trim(),
        message: message.trim(),
        severity,
        zoneId: zoneId || undefined,
        expiresAt,
      });
      setReceipt(result);
    } catch (err: any) {
      setError(err.message || 'Failed to transmit broadcast alert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedZoneName =
    zones?.find((z) => z.id === zoneId)?.name || 'All Active Monitored Corridors (Nationwide)';

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div>
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md shadow-amber-950/40">
            <Radio className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Emergency Broadcast Composer
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Compose geo-targeted emergency advisories, preview live mobile push notifications, and transmit alerts.
        </p>
      </div>

      {/* Main 2-Column Split: Form + Smartphone Simulator */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: Guided Composer Form */}
        <div className="lg:col-span-7 space-y-5">
          {/* Success Receipt Alert */}
          {receipt && (
            <div
              role="alert"
              data-testid="broadcast-receipt-card"
              className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 space-y-2 shadow-sm"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-sm">Emergency Broadcast Transmitted Successfully</h3>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                Alert broadcast #{receipt.broadcastId.slice(0, 10)} dispatched via WebSocket hub and mobile push relays to approximately{' '}
                <strong>{receipt.recipientsCount ?? 142}</strong> registered tourists and field responders.
              </p>
              <div className="pt-2 text-[11px] font-mono opacity-80 flex flex-wrap gap-3">
                <span>Target: {selectedZoneName}</span>
                <span>Severity: {receipt.severity}</span>
                <span>Sent: {new Date(receipt.sentAt).toLocaleTimeString()}</span>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              data-testid="broadcast-error-alert"
              className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-950 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200 flex items-start space-x-2.5"
            >
              <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Composer Form Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <form onSubmit={handleSendBroadcast} className="space-y-5">
              {/* Step 1: Target Sector */}
              <div>
                <label
                  htmlFor="target-zone"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1.5"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary-500" />
                  <span>Step 1: Geographic Target Sector</span>
                </label>
                <select
                  id="target-zone"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  data-testid="target-zone-select"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">🌐 All Pilgrimage Circuits (Nationwide Broadcast)</option>
                  {zones?.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      📍 {zone.name} ({zone.tier} • Score {zone.dangerScore})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Severity Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center space-x-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-primary-500" />
                  <span>Step 2: Advisory Severity Level</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Emergency */}
                  <button
                    type="button"
                    onClick={() => setSeverity('EMERGENCY')}
                    data-testid="severity-emergency-btn"
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      severity === 'EMERGENCY'
                        ? 'border-rose-600 bg-rose-50/80 ring-2 ring-rose-500 dark:bg-rose-950/50 dark:border-rose-700'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
                      <AlertOctagon className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Emergency</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Critical evacuation & siren push
                    </p>
                  </button>

                  {/* Warning */}
                  <button
                    type="button"
                    onClick={() => setSeverity('WARNING')}
                    data-testid="severity-warning-btn"
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      severity === 'WARNING'
                        ? 'border-orange-600 bg-orange-50/80 ring-2 ring-orange-500 dark:bg-orange-950/50 dark:border-orange-700'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Warning</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Severe hazard & route restriction
                    </p>
                  </button>

                  {/* Info */}
                  <button
                    type="button"
                    onClick={() => setSeverity('INFO')}
                    data-testid="severity-info-btn"
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      severity === 'INFO'
                        ? 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-500 dark:bg-sky-950/50 dark:border-sky-700'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 text-sky-600 dark:text-sky-400">
                      <Info className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Advisory</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      General pilgrim safety guidance
                    </p>
                  </button>
                </div>
              </div>

              {/* Title & Message */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="broadcast-title"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Advisory Headline Title
                  </label>
                  <input
                    id="broadcast-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Flash Flood Evacuation Advisory"
                    data-testid="broadcast-title-input"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="broadcast-message"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Emergency Instructions & Message
                  </label>
                  <textarea
                    id="broadcast-message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide clear, actionable safety instructions for tourists and field volunteers..."
                    data-testid="broadcast-message-input"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Expiry Duration */}
              <div>
                <label
                  htmlFor="expiry-duration"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1.5"
                >
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Alert Active Duration</span>
                </label>
                <div className="flex space-x-2">
                  {[1, 4, 12, 24].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setExpiryHours(hours)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                        expiryHours === hours
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {hours} {hours === 1 ? 'Hour' : 'Hours'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transmit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="submit-broadcast-btn"
                  className="inline-flex w-full items-center justify-center space-x-2 rounded-lg bg-rose-600 py-3 px-4 text-xs font-bold text-white shadow-lg shadow-rose-950/40 hover:bg-rose-500 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Transmitting Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Transmit Emergency Broadcast</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 5 Cols: Smartphone Push Notification Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Smartphone className="h-4 w-4 text-primary-500" />
            <span>Mobile Push Simulator</span>
          </div>

          {/* Smartphone Frame */}
          <div
            data-testid="mobile-simulator-frame"
            className="relative w-full max-w-sm rounded-[2.5rem] border-4 border-slate-800 bg-slate-950 p-4 shadow-2xl shadow-slate-950/80 min-h-[480px] flex flex-col justify-between"
          >
            {/* Top Speaker / Dynamic Island Notch */}
            <div className="mx-auto h-4 w-28 rounded-full bg-slate-800 mb-6" />

            {/* Lockscreen Clock */}
            <div className="text-center space-y-1 my-4">
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
            </div>

            {/* Simulated Push Notification Card */}
            <div
              data-testid="simulated-notification-card"
              className={`rounded-2xl p-4 shadow-2xl backdrop-blur-xl border transition-all ${
                severity === 'EMERGENCY'
                  ? 'border-rose-500/60 bg-rose-950/80 text-white ring-2 ring-rose-500/50'
                  : severity === 'WARNING'
                  ? 'border-orange-500/60 bg-orange-950/80 text-white ring-2 ring-orange-500/50'
                  : 'border-sky-500/60 bg-sky-950/80 text-white ring-2 ring-sky-500/50'
              }`}
            >
              {/* Notification Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white text-[11px] shadow-sm">
                    🛡️
                  </div>
                  <span className="text-[11px] font-bold tracking-wide uppercase opacity-90">
                    SAFE YATRA
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 font-mono">NOW</span>
              </div>

              {/* Notification Content */}
              <h4 className="text-xs font-bold leading-snug">
                {severity === 'EMERGENCY' ? '🔴 ' : severity === 'WARNING' ? '🟠 ' : '🔵 '}
                {title || 'Emergency Advisory'}
              </h4>
              <p className="text-[11px] leading-relaxed text-slate-200 mt-1 opacity-90">
                {message || 'Advisory details will appear in this preview...'}
              </p>

              {/* Geo Sector Tag */}
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-slate-300">
                <span className="truncate max-w-[180px]">📍 {selectedZoneName}</span>
                <span className="font-semibold uppercase tracking-wider">{severity}</span>
              </div>
            </div>

            {/* Bottom Home Bar */}
            <div className="mx-auto h-1 w-24 rounded-full bg-slate-700 mt-8 mb-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
