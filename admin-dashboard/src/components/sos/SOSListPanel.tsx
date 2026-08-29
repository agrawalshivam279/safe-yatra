'use client';

/**
 * Safe Yatra — Admin Live SOS List Panel
 * Scrolling queue of incoming emergency distress calls with telemetry and audio clips.
 */

import React, { useState } from 'react';
import { SOSEvent } from '../../services/sosService';
import {
  AlertOctagon,
  Phone,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Clock,
  Volume2,
  CheckCircle2,
  ShieldCheck,
  Search,
  Users,
} from 'lucide-react';

export interface SOSListPanelProps {
  events: SOSEvent[];
  selectedId: string | null;
  onSelect: (event: SOSEvent) => void;
  isLoading?: boolean;
}

type TabFilter = 'ACTIVE' | 'ALL' | 'RESOLVED';

const statusStyles = {
  PENDING: 'bg-rose-600 text-white animate-pulse',
  ACCEPTED: 'bg-sky-600 text-white',
  ARRIVED: 'bg-purple-600 text-white',
  RESOLVED: 'bg-emerald-600 text-white',
  CANCELLED: 'bg-slate-600 text-white',
};

export function SOSListPanel({
  events,
  selectedId,
  onSelect,
  isLoading = false,
}: SOSListPanelProps) {
  const [tab, setTab] = useState<TabFilter>('ACTIVE');
  const [search, setSearch] = useState<string>('');

  const filteredEvents = events.filter((ev) => {
    // Tab filter
    if (tab === 'ACTIVE' && (ev.status === 'RESOLVED' || ev.status === 'CANCELLED')) {
      return false;
    }
    if (tab === 'RESOLVED' && ev.status !== 'RESOLVED') {
      return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = ev.userName?.toLowerCase().includes(q);
      const matchPhone = ev.userPhone?.toLowerCase().includes(q);
      const matchId = ev.id.toLowerCase().includes(q);
      return matchName || matchPhone || matchId;
    }

    return true;
  });

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header & Search */}
      <div className="border-b border-slate-200 p-4 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="h-5 w-5 text-rose-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Emergency Queue
            </h2>
          </div>
          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-950 dark:text-rose-300">
            {events.filter((e) => e.status !== 'RESOLVED' && e.status !== 'CANCELLED').length} Active
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {(['ACTIVE', 'ALL', 'RESOLVED'] as TabFilter[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              data-testid={`tab-${t.toLowerCase()}`}
              className={`flex-1 rounded-md py-1 text-xs font-semibold transition-all ${
                tab === t
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search caller name, phone..."
            data-testid="search-sos-input"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      {/* Queue Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <ShieldCheck className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-1" />
            <p className="text-xs font-medium">No distress signals in this view</p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isSelected = selectedId === ev.id;
            const responders = ev.responders || [];

            return (
              <div
                key={ev.id}
                data-testid={`sos-item-${ev.id}`}
                onClick={() => onSelect(ev)}
                className={`group rounded-xl p-3.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary-50/80 border border-primary-300 dark:bg-primary-950/40 dark:border-primary-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Top Row: Caller & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                      {ev.userName || `Tourist (${ev.userId.slice(0, 8)})`}
                    </h3>
                    {ev.userPhone && (
                      <a
                        href={`tel:${ev.userPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 text-[11px] text-slate-500 hover:text-primary-600 dark:text-slate-400 mt-0.5"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{ev.userPhone}</span>
                      </a>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      statusStyles[ev.status] || statusStyles.PENDING
                    }`}
                  >
                    {ev.status}
                  </span>
                </div>

                {/* Telemetry Row: Battery + Coordinates */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center space-x-1.5 font-mono">
                    <span>GPS: {ev.location.lat.toFixed(4)}, {ev.location.lng.toFixed(4)}</span>
                  </div>

                  {ev.batteryLevel !== undefined && (
                    <div className="flex items-center space-x-1">
                      {ev.batteryLevel < 20 ? (
                        <BatteryWarning className="h-3.5 w-3.5 text-rose-500" />
                      ) : (
                        <Battery className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      <span>{ev.batteryLevel}%</span>
                    </div>
                  )}
                </div>

                {/* Audio Recording Player */}
                {ev.audioRecordingUrl && (
                  <div className="mt-2.5 flex items-center space-x-2 rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                    <Volume2 className="h-3.5 w-3.5 text-primary-500 shrink-0" />
                    <audio
                      controls
                      src={ev.audioRecordingUrl}
                      className="h-6 w-full"
                      data-testid={`audio-player-${ev.id}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* Responders Info */}
                {responders.length > 0 && (
                  <div className="mt-2.5 flex items-center space-x-1.5 text-[11px] text-sky-600 dark:text-sky-400">
                    <Users className="h-3 w-3" />
                    <span>
                      Mitra: <strong>{responders[0].name}</strong> ({responders[0].status})
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
