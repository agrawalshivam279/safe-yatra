/**
 * Safe Yatra — Admin Zones Reactive Query Hooks
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zoneAdminService, AdminZoneDetail } from '../services/zoneAdminService';
import { socketService } from '../services/socketService';

export const ADMIN_ZONES_QUERY_KEY = ['admin', 'zones'];

export function useAdminZonesList() {
  const queryClient = useQueryClient();

  const query = useQuery<AdminZoneDetail[]>({
    queryKey: ADMIN_ZONES_QUERY_KEY,
    queryFn: () => zoneAdminService.getZones(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const unsubDanger = socketService.onDangerScoreUpdate(() => {
      queryClient.invalidateQueries({ queryKey: ADMIN_ZONES_QUERY_KEY });
    });

    return () => {
      unsubDanger();
    };
  }, [queryClient]);

  return query;
}

export function useAdminZoneDetail(id: string) {
  const queryClient = useQueryClient();

  const query = useQuery<AdminZoneDetail>({
    queryKey: [...ADMIN_ZONES_QUERY_KEY, id],
    queryFn: () => zoneAdminService.getZoneById(id),
    enabled: Boolean(id),
    staleTime: 15 * 1000,
  });

  useEffect(() => {
    const unsubDanger = socketService.onDangerScoreUpdate((data) => {
      if (data.zoneId === id) {
        queryClient.invalidateQueries({ queryKey: [...ADMIN_ZONES_QUERY_KEY, id] });
      }
    });

    return () => {
      unsubDanger();
    };
  }, [id, queryClient]);

  return query;
}
