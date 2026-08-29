/**
 * Safe Yatra — Admin Analytics Query Hook
 * Automatically refreshes every 30s and invalidates on real-time Socket.IO events.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService, AdminAnalyticsData } from '../services/adminService';
import { socketService } from '../services/socketService';

export const ADMIN_ANALYTICS_QUERY_KEY = ['admin', 'analytics'];

export function useAdminAnalytics() {
  const queryClient = useQueryClient();

  const query = useQuery<AdminAnalyticsData>({
    queryKey: ADMIN_ANALYTICS_QUERY_KEY,
    queryFn: () => adminService.getAnalytics(),
    staleTime: 30 * 1000, // 30 seconds fresh
    refetchInterval: 30 * 1000, // Auto polling every 30 seconds
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_ANALYTICS_QUERY_KEY });
    };

    const unsubTriggered = socketService.onSOSTriggered(invalidate);
    const unsubAccepted = socketService.onSOSAccepted(invalidate);
    const unsubResolved = socketService.onSOSResolved(invalidate);
    const unsubCancelled = socketService.onSOSCancelled(invalidate);
    const unsubDanger = socketService.onDangerScoreUpdate(invalidate);

    return () => {
      unsubTriggered();
      unsubAccepted();
      unsubResolved();
      unsubCancelled();
      unsubDanger();
    };
  }, [queryClient]);

  return query;
}
