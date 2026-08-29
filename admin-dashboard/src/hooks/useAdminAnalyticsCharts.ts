/**
 * Safe Yatra — Admin Analytics Reactive Query Hook
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsService, AnalyticsOverviewData } from '../services/analyticsService';
import { socketService } from '../services/socketService';

export const ADMIN_ANALYTICS_CHARTS_KEY = ['admin', 'analytics', 'charts'];

export function useAdminAnalyticsCharts(days: number = 7) {
  const queryClient = useQueryClient();

  const query = useQuery<AnalyticsOverviewData>({
    queryKey: [...ADMIN_ANALYTICS_CHARTS_KEY, days],
    queryFn: () => analyticsService.getAnalyticsOverview(days),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const unsubSOS = socketService.onSOSResolved(() => {
      queryClient.invalidateQueries({ queryKey: ADMIN_ANALYTICS_CHARTS_KEY });
    });
    const unsubDanger = socketService.onDangerScoreUpdate(() => {
      queryClient.invalidateQueries({ queryKey: ADMIN_ANALYTICS_CHARTS_KEY });
    });

    return () => {
      unsubSOS();
      unsubDanger();
    };
  }, [queryClient]);

  return query;
}
