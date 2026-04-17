import { useState, useCallback } from 'react';
import type { Shipment, Priority } from '@/api/types';

const CONTRADICTION_KEYWORDS = [
  'no priority handling',
  'low-priority',
  '48 hours',
  'no rush',
  'delay acceptable',
  'overflow storage',
  'economy batch',
];

function detectContradiction(suggestion: string, priority: Priority): boolean {
  if (priority === 'normal') return false;
  const lower = suggestion.toLowerCase();
  return CONTRADICTION_KEYWORDS.some((kw) => lower.includes(kw));
}

export function useRouteSuggestion() {
  const [suggestion, setSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasContradiction, setHasContradiction] = useState(false);

  const fetchSuggestion = useCallback(async (shipment: Shipment) => {
    setSuggestion('');
    setError(null);
    setIsLoading(true);
    setHasContradiction(false);

    try {
      const res = await fetch('/api/ai/route-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: shipment.id,
          shipment_data: shipment,
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch suggestion');
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setSuggestion(accumulated);
      }

      setHasContradiction(detectContradiction(accumulated, shipment.priority));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSuggestion('');
    setError(null);
    setIsLoading(false);
    setHasContradiction(false);
  }, []);

  return { suggestion, isLoading, error, hasContradiction, fetchSuggestion, reset };
}
