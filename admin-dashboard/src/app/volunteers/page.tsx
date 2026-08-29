'use client';

/**
 * Safe Yatra — Admin Yaatri Mitra Volunteer Registry Page
 * Directory and dispatch management for vetted field volunteers and emergency first responders.
 */

import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Radio,
  Star,
  Search,
  Filter,
  RefreshCw,
  Phone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useAdminVolunteers, ADMIN_VOLUNTEERS_QUERY_KEY } from '../../hooks/useAdminVolunteers';
import { volunteerAdminService } from '../../services/volunteerAdminService';
import { useQueryClient } from '@tanstack/react-query';

type TabFilter = 'ALL' | 'VERIFIED' | 'PENDING_VERIFICATION' | 'ON_DUTY';

export default function VolunteersPage() {
  const queryClient = useQueryClient();
  const { data: volunteersData, isLoading, refetch } = useAdminVolunteers();

  const [search, setSearch] = useState<string>('');
  const [tabFilter, setTabFilter] = useState<TabFilter>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const volunteers = volunteersData || [];

  // Summary Metrics
  const totalCount = volunteers.length;
  const onDutyCount = volunteers.filter((v) => v.isOnDuty).length;
  const verifiedCount = volunteers.filter((v) => v.verificationStatus === 'VERIFIED').length;
  const avgRating =
    volunteers.length > 0
      ? (volunteers.reduce((acc, v) => acc + (v.rating || 5.0), 0) / volunteers.length).toFixed(1)
      : '5.0';

  // Filtered Volunteers
  const filteredVolunteers = volunteers.filter((v) => {
    // Tab filter
    if (tabFilter === 'VERIFIED' && v.verificationStatus !== 'VERIFIED') return false;
    if (tabFilter === 'PENDING_VERIFICATION' && v.verificationStatus !== 'PENDING_VERIFICATION')
      return false;
    if (tabFilter === 'ON_DUTY' && !v.isOnDuty) return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = v.name.toLowerCase();
      const matchPhone = v.phone.toLowerCase();
      const matchId = v.id.toLowerCase();
      return matchName.includes(q) || matchPhone.includes(q) || matchId.includes(q);
    }

    return true;
  });

  const handleVerify = async (id: string, name: string) => {
    setActionLoadingId(id);
    setFeedback(null);
    try {
      await volunteerAdminService.verifyVolunteer(id);
      queryClient.invalidateQueries({ queryKey: ADMIN_VOLUNTEERS_QUERY_KEY });
      setFeedback({
        type: 'success',
        text: `Yaatri Mitra responder "${name}" successfully verified. Field dispatch enabled.`,
      });
      refetch();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to verify volunteer.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleDuty = async (id: string, currentStatus: boolean, name: string) => {
    setActionLoadingId(id);
    setFeedback(null);
    const newStatus = !currentStatus;
    try {
      await volunteerAdminService.toggleDutyStatus(id, newStatus);
      queryClient.invalidateQueries({ queryKey: ADMIN_VOLUNTEERS_QUERY_KEY });
      setFeedback({
        type: 'success',
        text: `Updated on-duty status for "${name}" to ${newStatus ? 'ON DUTY' : 'OFF DUTY'}.`,
      });
      refetch();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to update duty status.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-950/40">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Yaatri Mitra Volunteer Registry
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review background credentials, manage on-duty readiness, and approve emergency first responders.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          data-testid="refresh-volunteers-btn"
          aria-label="Refresh volunteer list"
          className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4 Summary Telemetry Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Total Mitras */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Registered</span>
            <Users className="h-4 w-4 text-primary-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Vetted community guides</p>
        </div>

        {/* Card 2: Active On-Duty */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active On-Duty</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {onDutyCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Ready for SOS dispatch</p>
        </div>

        {/* Card 3: Verified Responders */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Badges</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {verifiedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Identity & Police verified</p>
        </div>

        {/* Card 4: Avg Performance Rating */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Response Rating</span>
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {avgRating} <span className="text-sm font-normal text-slate-400">/ 5.0</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Post-rescue pilgrim feedback</p>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          role="alert"
          data-testid="volunteer-feedback-alert"
          className={`flex items-start space-x-2.5 rounded-xl p-3.5 text-xs ${
            feedback.type === 'success'
              ? 'border border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
              : 'border border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200'
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

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by volunteer name, phone..."
            data-testid="search-volunteers-input"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center space-x-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
          </span>

          {[
            { id: 'ALL', label: 'All' },
            { id: 'ON_DUTY', label: 'On Duty' },
            { id: 'VERIFIED', label: 'Verified' },
            { id: 'PENDING_VERIFICATION', label: 'Pending' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabFilter(tab.id as TabFilter)}
              data-testid={`filter-${tab.id.toLowerCase()}-btn`}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                tabFilter === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Volunteer Directory Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Volunteer & Contact</th>
                <th className="py-3.5 px-4">Verification Status</th>
                <th className="py-3.5 px-4">Duty Readiness</th>
                <th className="py-3.5 px-4">Responses</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredVolunteers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No Yaatri Mitra volunteers matched the search criteria.
                  </td>
                </tr>
              ) : (
                filteredVolunteers.map((v) => (
                  <tr
                    key={v.id}
                    data-testid={`volunteer-row-${v.id}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Name & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{v.name}</div>
                      <a
                        href={`tel:${v.phone}`}
                        className="inline-flex items-center space-x-1 text-[11px] text-primary-600 hover:underline font-mono mt-0.5"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{v.phone}</span>
                      </a>
                    </td>

                    {/* Verification Status */}
                    <td className="py-3.5 px-4">
                      {v.verificationStatus === 'VERIFIED' ? (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/30 dark:bg-emerald-950 dark:text-emerald-300">
                          <ShieldCheck className="h-3 w-3" />
                          <span>VERIFIED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/30 dark:bg-amber-950 dark:text-amber-300">
                          <Clock className="h-3 w-3" />
                          <span>PENDING CHECK</span>
                        </span>
                      )}
                    </td>

                    {/* Duty Status */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleDuty(v.id, v.isOnDuty, v.name)}
                        disabled={actionLoadingId === v.id}
                        data-testid={`toggle-duty-${v.id}`}
                        className={`inline-flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                          v.isOnDuty
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {v.isOnDuty ? (
                          <>
                            <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
                            <span>ON DUTY</span>
                          </>
                        ) : (
                          <span>OFF DUTY</span>
                        )}
                      </button>
                    </td>

                    {/* Total Responses */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {v.totalResponses}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">rescues</span>
                    </td>

                    {/* Rating */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1 text-slate-900 dark:text-white font-bold">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span>{v.rating ? v.rating.toFixed(1) : '5.0'}</span>
                      </div>
                    </td>

                    {/* Admin Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {v.verificationStatus === 'PENDING_VERIFICATION' ? (
                        <button
                          type="button"
                          onClick={() => handleVerify(v.id, v.name)}
                          disabled={actionLoadingId === v.id}
                          data-testid={`verify-volunteer-${v.id}`}
                          className="inline-flex items-center space-x-1 rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50 transition-colors"
                        >
                          {actionLoadingId === v.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                          <span>Verify</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Active Responder
                        </span>
                      )}
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
