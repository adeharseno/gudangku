import { useQuery } from '@tanstack/react-query';
import type { Shipment, ShipmentStatus, Priority } from '@/api/types';

interface UseShipmentsParams {
  status?: ShipmentStatus | '';
  priority?: Priority | '';
}

export function useShipments(params: UseShipmentsParams = {}) {
  const { status, priority } = params;

  return useQuery<Shipment[]>({
    queryKey: ['shipments', { status, priority }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (status) searchParams.set('status', status);
      if (priority) searchParams.set('priority', priority);

      const url = searchParams.toString()
        ? `/api/shipments?${searchParams}`
        : '/api/shipments';

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch shipments');
      return res.json();
    },
  });
}
