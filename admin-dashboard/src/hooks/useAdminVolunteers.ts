/**
 * Safe Yatra — Admin Volunteers Reactive Query Hook
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { volunteerAdminService, VolunteerRecord } from '../services/volunteerAdminService';
import { socketService } from '../services/socketService';

export const ADMIN_VOLUNTEERS_QUERY_KEY = ['admin', 'volunteers'];

export function useAdminVolunteers() {
  const queryClient = useQueryClient();

  const query = useQuery<VolunteerRecord[]>({
    queryKey: ADMIN_VOLUNTEERS_QUERY_KEY,
    queryFn: () => volunteerAdminService.getVolunteers(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const unsubSOS = socketService.onSOSAccepted(() => {
      queryClient.invalidateQueries({ queryKey: ADMIN_VOLUNTEERS_QUERY_KEY });
    });

    return () => {
      unsubSOS();
    };
  }, [queryClient]);

  return query;
}
