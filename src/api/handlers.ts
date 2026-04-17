import { http, HttpResponse, delay } from 'msw';
import type { Shipment, ShipmentStatus, Priority } from './types';
import type { StatusChangeEvent, PriorityUpdateEvent } from './types';
import { VALID_TRANSITIONS } from './types';
import { seedShipments, createNewShipment, ROUTE_SUGGESTIONS } from './mock-data';

// ─── In-memory store ─────────────────────────────────────────────────────────
// Seeded once at module load; mutations persist within a browser session.
const shipments: Shipment[] = [...seedShipments];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSSEEvent(): { type: string; data: unknown } | null {
  const nonTerminal = shipments.filter(
    (s) => s.status !== 'delivered' && s.status !== 'cancelled',
  );

  const roll = Math.random();

  if (roll < 0.2 || nonTerminal.length === 0) {
    // new_shipment — 20%, or fallback when all shipments are terminal
    const newShipment = createNewShipment();
    shipments.push(newShipment);
    return { type: 'new_shipment', data: newShipment };
  } else if (roll < 0.7) {
    // status_change — 50%
    const target = nonTerminal[Math.floor(Math.random() * nonTerminal.length)];
    const transitions = VALID_TRANSITIONS[target.status] ?? [];
    if (transitions.length === 0) return null;
    const nextStatus = transitions[0]; // advance to first valid next state
    const idx = shipments.findIndex((s) => s.id === target.id);
    const now = new Date().toISOString();
    shipments[idx] = {
      ...shipments[idx],
      status: nextStatus,
      updated_at: now,
      ...(nextStatus === 'delivered' ? { delivered_at: now } : {}),
    };
    const event: StatusChangeEvent = { id: target.id, status: nextStatus, timestamp: now };
    return { type: 'status_change', data: event };
  } else {
    // priority_update — 30%
    const target = shipments[Math.floor(Math.random() * shipments.length)];
    const priorities: Priority[] = ['normal', 'urgent', 'critical'];
    const newPriority = priorities[Math.floor(Math.random() * priorities.length)];
    const idx = shipments.findIndex((s) => s.id === target.id);
    shipments[idx] = { ...shipments[idx], priority: newPriority };
    const event: PriorityUpdateEvent = {
      id: target.id,
      priority: newPriority,
      timestamp: new Date().toISOString(),
    };
    return { type: 'priority_update', data: event };
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [
  // GET /api/shipments
  // Returns today's shipments. Supports ?status= and ?priority= query params (AND logic).
  http.get('/api/shipments', async ({ request }) => {
    await delay(randomInt(200, 500));

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status') as ShipmentStatus | null;
    const priorityFilter = url.searchParams.get('priority') as Priority | null;

    let result = [...shipments];
    if (statusFilter) result = result.filter((s) => s.status === statusFilter);
    if (priorityFilter) result = result.filter((s) => s.priority === priorityFilter);

    return HttpResponse.json(result);
  }),

  // PATCH /api/shipments/:id/status
  // Validates against status machine. Returns 400 for invalid transitions, 404 if not found.
  http.patch('/api/shipments/:id/status', async ({ request, params }) => {
    await delay(randomInt(100, 300));

    const id = params.id as string;
    const body = (await request.json()) as { status: ShipmentStatus };

    if (!body?.status) {
      return HttpResponse.json({ error: 'Missing status in request body' }, { status: 400 });
    }

    const idx = shipments.findIndex((s) => s.id === id);
    if (idx === -1) {
      return HttpResponse.json({ error: `Shipment ${id} not found` }, { status: 404 });
    }

    const shipment = shipments[idx];
    const validTransitions = VALID_TRANSITIONS[shipment.status] ?? [];

    if (!validTransitions.includes(body.status)) {
      return HttpResponse.json(
        { error: `Invalid transition from '${shipment.status}' to '${body.status}'` },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const updated: Shipment = {
      ...shipment,
      status: body.status,
      updated_at: now,
      ...(body.status === 'delivered' ? { delivered_at: now } : {}),
    };

    shipments[idx] = updated;
    return HttpResponse.json(updated);
  }),

  // GET /api/shipments/stream (SSE)
  // Emits new_shipment / status_change / priority_update events every 3–8s.
  // Candidates connect with EventSource and update local state from the event payloads.
  http.get('/api/shipments/stream', ({ request }) => {
    const encoder = new TextEncoder();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const stream = new ReadableStream({
      start(controller) {
        const scheduleNext = () => {
          const delayMs = randomInt(3000, 8000);
          timeoutId = setTimeout(() => {
            const event = generateSSEEvent();
            if (event) {
              const chunk = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
              controller.enqueue(encoder.encode(chunk));
            }
            scheduleNext();
          }, delayMs);
        };

        request.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          controller.close();
        });

        scheduleNext();
      },
      cancel() {
        clearTimeout(timeoutId);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),

  // POST /api/ai/route-suggestion
  // Streams a routing suggestion word-by-word (ReadableStream of raw text, NOT SSE).
  // ~30% of suggestions intentionally contradict the shipment's priority — the ambiguous requirement.
  http.post('/api/ai/route-suggestion', async ({ request }) => {
    const body = (await request.json()) as {
      shipment_id?: string;
      shipment_data?: Shipment;
    };

    if (!body?.shipment_id || !body?.shipment_data) {
      return HttpResponse.json(
        { error: 'Missing shipment_id or shipment_data in request body' },
        { status: 400 },
      );
    }

    const useContradiction = Math.random() < 0.3;
    const pool = useContradiction ? ROUTE_SUGGESTIONS.contradiction : ROUTE_SUGGESTIONS.normal;
    const suggestion = pool[Math.floor(Math.random() * pool.length)];
    const words = suggestion.split(' ');

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const word of words) {
          await new Promise<void>((resolve) => setTimeout(resolve, randomInt(50, 100)));
          controller.enqueue(encoder.encode(word + ' '));
        }
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }),

  // GET /api/shipments/stats
  // Computes aggregates from in-memory array on each call.
  // Note: total_delayed is cross-cutting — a shipment can appear in both
  // total_delayed and total_received/total_pending simultaneously.
  http.get('/api/shipments/stats', async () => {
    await delay(randomInt(100, 200));

    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    const stats = {
      total_received: shipments.filter((s) => s.status === 'received').length,
      total_pending: shipments.filter(
        (s) => s.status === 'sorting' || s.status === 'ready_to_dispatch',
      ).length,
      total_dispatched: shipments.filter(
        (s) => s.status === 'dispatched' || s.status === 'delivered',
      ).length,
      total_delayed: shipments.filter(
        (s) =>
          ['received', 'sorting', 'ready_to_dispatch'].includes(s.status) &&
          now - new Date(s.updated_at).getTime() > TWO_HOURS_MS,
      ).length,
      total_on_hold: shipments.filter(
        (s) => s.status === 'on_hold' || s.status === 'cancelled',
      ).length,
    };

    return HttpResponse.json(stats);
  }),
];
