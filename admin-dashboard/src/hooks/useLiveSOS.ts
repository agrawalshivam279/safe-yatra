/**
 * Safe Yatra — Admin Live SOS Reactive Query Hook
 * Connects to Socket.IO real-time stream to mutate active SOS state in place.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sosService, SOSEvent } from '../services/sosService';
import { socketService } from '../services/socketService';

export const LIVE_SOS_QUERY_KEY = ['admin', 'sos', 'active'];

export function useLiveSOS() {
  const queryClient = useQueryClient();

  const query = useQuery<SOSEvent[]>({
    queryKey: LIVE_SOS_QUERY_KEY,
    queryFn: () => sosService.getActiveSOS(),
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    // 1. SOS Triggered
    const unsubTriggered = socketService.onSOSTriggered((payload: any) => {
      queryClient.setQueryData<SOSEvent[]>(LIVE_SOS_QUERY_KEY, (old = []) => {
        const exists = old.some((item) => item.id === payload.id);
        if (exists) {
          return old.map((item) => (item.id === payload.id ? { ...item, ...payload } : item));
        }
        return [payload, ...old];
      });
    });

    // 2. SOS Accepted
    const unsubAccepted = socketService.onSOSAccepted((payload: any) => {
      queryClient.setQueryData<SOSEvent[]>(LIVE_SOS_QUERY_KEY, (old = []) => {
        return old.map((item) => {
          if (item.id === payload.sosId) {
            const responders = item.responders || [];
            const exists = responders.some((r) => r.id === payload.responder?.id);
            const updatedResponders = exists
              ? responders.map((r) => (r.id === payload.responder?.id ? { ...r, ...payload.responder } : r))
              : payload.responder
              ? [...responders, payload.responder]
              : responders;

            return {
              ...item,
              status: 'ACCEPTED',
              responders: updatedResponders,
            };
          }
          return item;
        });
      });
    });

    // 3. SOS Mitra Location Stream
    const unsubMitraLoc = socketService.onSOSMitraLocation((payload: any) => {
      queryClient.setQueryData<SOSEvent[]>(LIVE_SOS_QUERY_KEY, (old = []) => {
        return old.map((item) => {
          if (item.id === payload.sosId) {
            const responders = (item.responders || []).map((r) => {
              if (r.id === payload.volunteerId) {
                return {
                  ...r,
                  location: payload.location,
                  batteryLevel: payload.batteryLevel ?? r.batteryLevel,
                };
              }
              return r;
            });
            return { ...item, responders };
          }
          return item;
        });
      });
    });

    // 4. SOS Arrived
    const unsubArrived = socketService.onSOSArrived((payload: any) => {
      queryClient.setQueryData<SOSEvent[]>(LIVE_SOS_QUERY_KEY, (old = []) => {
        return old.map((item) =>
          item.id === payload.sosId ? { ...item, status: 'ARRIVED' } : item
        );
      });
    });

    // 5. SOS Resolved
    const unsubResolved = socketService.onSOSResolved((payload: any) => {
      queryClient.setQueryData<SOSEvent[]>(LIVE_SOS_QUERY_KEY, (old = []) => {
        return old.map((item) =>
          item.id === payload.sosId ? { ...item, status: 'RESOLVED' } : item
        );
      });
    });

    // 6. SOS Cancelled
    const unsubCancelled = socketService.onSOSCancelled((payload: any) => {
      queryClient.setQueryData<SOSEvent[]>(LIVE_SOS_QUERY_KEY, (old = []) => {
        return old.map((item) =>
          item.id === payload.sosId ? { ...item, status: 'CANCELLED' } : item
        );
      });
    });

    return () => {
      unsubTriggered();
      unsubAccepted();
      unsubMitraLoc();
      unsubArrived();
      unsubResolved();
      unsubCancelled();
    };
  }, [queryClient]);

  return query;
}
