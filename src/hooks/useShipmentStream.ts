import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Shipment, ShipmentStatus, Priority } from '@/api/types';

export function useShipmentStream() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/shipments/stream');
    eventSourceRef.current = es;

    es.addEventListener('new_shipment', (e) => {
      const newShipment: Shipment = JSON.parse(e.data);
      queryClient.setQueriesData<Shipment[]>(
        { queryKey: ['shipments'] },
        (old) => (old ? [newShipment, ...old] : [newShipment]),
      );
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    es.addEventListener('status_change', (e) => {
      const { id, status, timestamp } = JSON.parse(e.data) as {
        id: string;
        status: ShipmentStatus;
        timestamp: string;
      };
      queryClient.setQueriesData<Shipment[]>(
        { queryKey: ['shipments'] },
        (old) =>
          old?.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status,
                  updated_at: timestamp,
                  ...(status === 'delivered' ? { delivered_at: timestamp } : {}),
                }
              : s,
          ),
      );
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    es.addEventListener('priority_update', (e) => {
      const { id, priority } = JSON.parse(e.data) as {
        id: string;
        priority: Priority;
      };
      queryClient.setQueriesData<Shipment[]>(
        { queryKey: ['shipments'] },
        (old) =>
          old?.map((s) => (s.id === id ? { ...s, priority } : s)),
      );
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [queryClient]);
}
