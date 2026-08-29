'use client';

/**
 * Safe Yatra — Admin Live Emergency SOS Command Feed
 * Split-view emergency operations command screen with real-time queue and tactical response map.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertOctagon,
  Radio,
  RefreshCw,
  PhoneCall,
  Volume2,
  ShieldCheck,
} from 'lucide-react';
import { useLiveSOS } from '../../hooks/useLiveSOS';
import { SOSListPanel } from '../../components/sos/SOSListPanel';
import { SOSMapPanel } from '../../components/sos/SOSMapPanel';
import { sosService, SOSEvent } from '../../services/sosService';
import { useQueryClient } from '@tanstack/react-query';
import { LIVE_SOS_QUERY_KEY } from '../../hooks/useLiveSOS';

export default function LiveSOSPage() {
  const queryClient = useQueryClient();
  const { data: eventsData, isLoading, refetch } = useLiveSOS();

  const events = useMemo(() => eventsData || [], [eventsData]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  // Auto-select first active event if none selected
  useEffect(() => {
    if (!selectedId && events.length > 0) {
      const firstActive = events.find((e) => e.status !== 'RESOLVED' && e.status !== 'CANCELLED');
      setSelectedId(firstActive ? firstActive.id : events[0].id);
    }
  }, [events, selectedId]);

  const selectedEvent = events.find((e) => e.id === selectedId) || null;

  const handleResolve = async (id: string) => {
    setIsResolving(true);
    try {
      await sosService.resolveSOS(id);
      queryClient.setQueryData<SOSEvent[]>(LIVE_SOS_QUERY_KEY, (old = []) => {
        return old.map((item) => (item.id === id ? { ...item, status: 'RESOLVED' } : item));
      });
    } catch (err: any) {
      console.error('Failed to resolve SOS event:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const activeCount = events.filter(
    (e) => e.status !== 'RESOLVED' && e.status !== 'CANCELLED'
  ).length;

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-950/40 animate-pulse">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Live Emergency SOS Command Feed
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time incident dispatch, tourist GPS telemetry, voice clip playback, and responder tracking.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="inline-flex items-center space-x-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>{activeCount} Active Emergencies</span>
          </div>

          <button
            onClick={() => refetch()}
            data-testid="refresh-sos-btn"
            aria-label="Refresh SOS events"
            className="inline-flex items-center space-x-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Split-Screen Emergency Command Operations Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 min-h-[600px]">
        {/* Left Column: SOS Queue List (5 cols) */}
        <div className="lg:col-span-5 h-[600px]">
          <SOSListPanel
            events={events}
            selectedId={selectedId}
            onSelect={(ev) => setSelectedId(ev.id)}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column: Tactical Map & Dispatch Hub (7 cols) */}
        <div className="lg:col-span-7 h-[600px]">
          <SOSMapPanel
            event={selectedEvent}
            onResolve={handleResolve}
            isResolving={isResolving}
          />
        </div>
      </div>
    </div>
  );
}
