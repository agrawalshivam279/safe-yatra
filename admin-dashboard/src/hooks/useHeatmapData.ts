/**
 * Safe Yatra — Admin Heatmap & Zone Reactive Query Hooks
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mapService, HeatmapData, ZoneData } from '../services/mapService';
import { socketService } from '../services/socketService';

export const HEATMAP_QUERY_KEY = ['admin', 'heatmap'];
export const ZONES_QUERY_KEY = ['zones'];

export function useHeatmapClusters(lookbackHours: number = 24, gridSizeDegrees: number = 0.005) {
  return useQuery<HeatmapData>({
    queryKey: [...HEATMAP_QUERY_KEY, lookbackHours, gridSizeDegrees],
    queryFn: () => mapService.getHeatmapData(lookbackHours, gridSizeDegrees),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useZones() {
  const queryClient = useQueryClient();

  const query = useQuery<ZoneData[]>({
    queryKey: ZONES_QUERY_KEY,
    queryFn: () => mapService.getZones(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const unsubDanger = socketService.onDangerScoreUpdate(() => {
      queryClient.invalidateQueries({ queryKey: ZONES_QUERY_KEY });
    });

    return () => {
      unsubDanger();
    };
  }, [queryClient]);

  return query;
}
