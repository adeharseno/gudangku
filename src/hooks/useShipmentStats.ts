import { useQuery } from '@tanstack/react-query';
import type { StatsResponse } from '@/api/types';

export function useShipmentStats() {
  return useQuery<StatsResponse>({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/shipments/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30_000,
  });
}
