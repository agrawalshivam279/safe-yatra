'use client';

/**
 * Safe Yatra — Admin Dashboard KPI Card
 * Reusable high-visibility telemetry card with badges, trends, and loading skeletons.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: {
    text: string;
    variant?: 'critical' | 'warning' | 'success' | 'info' | 'neutral';
  };
  trend?: {
    value: string;
    isPositive: boolean;
  };
  isLoading?: boolean;
  href?: string;
  onClick?: () => void;
}

const badgeVariants = {
  critical: 'bg-rose-500/10 text-rose-600 border border-rose-500/30 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  warning: 'bg-amber-500/10 text-amber-600 border border-amber-500/30 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  success: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  info: 'bg-sky-500/10 text-sky-600 border border-sky-500/30 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  neutral: 'bg-slate-500/10 text-slate-600 border border-slate-500/30 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  isLoading = false,
  href,
  onClick,
}: KPICardProps) {
  if (isLoading) {
    return (
      <div
        data-testid="kpi-card-loading"
        className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="mt-4 h-8 w-16 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-3 w-32 rounded bg-slate-100 dark:bg-slate-800/60" />
      </div>
    );
  }

  const content = (
    <div
      data-testid="kpi-card"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${
        href || onClick ? 'cursor-pointer hover:border-primary-500/50 dark:hover:border-primary-500/50' : ''
      }`}
    >
      {/* Top Row: Title + Icon */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-primary-50 group-hover:text-primary-600 dark:group-hover:bg-primary-950/60 dark:group-hover:text-primary-400 transition-colors">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Metric Value & Badge */}
      <div className="mt-3 flex items-baseline space-x-2.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {value}
        </span>
        {badge && (
          <span
            data-testid="kpi-badge"
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
              badgeVariants[badge.variant || 'neutral']
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {/* Subtitle / Trend Line */}
      {(subtitle || trend) && (
        <div className="mt-2 flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
          {trend && (
            <span
              className={`inline-flex items-center font-medium ${
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
              )}
              {trend.value}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
