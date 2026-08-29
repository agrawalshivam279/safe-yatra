/**
 * Safe Yatra — Backend Spatial Server
 * Background Job Scheduler & Lifecycle Coordinator.
 */

import { runCleanupExpiredSOSJob } from './cleanupExpiredSOS';
import { runDangerScoreRefreshJob } from './dangerScoreRefresh';

export interface SchedulerOptions {
  dangerRefreshIntervalMs?: number;
  expiredSOSIntervalMs?: number;
}

let dangerRefreshTimer: NodeJS.Timeout | null = null;
let expiredSOSTimer: NodeJS.Timeout | null = null;

const DEFAULT_DANGER_REFRESH_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_EXPIRED_SOS_MS = 60 * 60 * 1000; // 1 hour

/**
 * Starts recurring background jobs for danger score recalculation and expired SOS maintenance.
 */
export const startBackgroundJobs = (options?: SchedulerOptions): void => {
  stopBackgroundJobs();

  const dangerInterval = options?.dangerRefreshIntervalMs ?? DEFAULT_DANGER_REFRESH_MS;
  const expiredSOSInterval = options?.expiredSOSIntervalMs ?? DEFAULT_EXPIRED_SOS_MS;

  dangerRefreshTimer = setInterval(async () => {
    try {
      await runDangerScoreRefreshJob();
    } catch {
      // Catch-all to prevent unhandled interval exceptions
    }
  }, dangerInterval);

  expiredSOSTimer = setInterval(async () => {
    try {
      await runCleanupExpiredSOSJob();
    } catch {
      // Catch-all to prevent unhandled interval exceptions
    }
  }, expiredSOSInterval);
};

/**
 * Stops all active background job timers.
 */
export const stopBackgroundJobs = (): void => {
  if (dangerRefreshTimer) {
    clearInterval(dangerRefreshTimer);
    dangerRefreshTimer = null;
  }

  if (expiredSOSTimer) {
    clearInterval(expiredSOSTimer);
    expiredSOSTimer = null;
  }
};

/**
 * Checks whether background job timers are currently active.
 */
export const isJobsRunning = (): boolean => {
  return dangerRefreshTimer !== null || expiredSOSTimer !== null;
};
