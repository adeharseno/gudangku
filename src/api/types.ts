// Core domain types for GudangKu shipment tracking

export type ShipmentStatus =
  | 'received'
  | 'sorting'
  | 'ready_to_dispatch'
  | 'dispatched'
  | 'delivered'
  | 'on_hold'
  | 'cancelled';

export type Priority = 'normal' | 'urgent' | 'critical';

export interface Carrier {
  name: string;
  phone?: string;        // Optional — some carriers have no phone in seed data
  tracking_url?: string; // Optional
}

export interface Shipment {
  id: string;              // Internal warehouse ID, format "SHP-001"
  tracking_id: string;     // External carrier tracking ID (some are very long)
  status: ShipmentStatus;
  priority: Priority;
  sender: string;
  recipient: string;
  destination: string;     // Warehouse zone or delivery address
  carrier: Carrier;
  weight_kg: number;
  package_count: number;   // Number of boxes in the shipment
  notes?: string;          // Optional, sometimes contains HTML-like content
  created_at: string;      // ISO 8601
  updated_at: string;      // ISO 8601 — used for "delayed" computation in stats
  delivered_at?: string;   // ISO 8601 — only set when status is 'delivered'
}

export interface StatsResponse {
  total_received: number;   // Count of status === 'received'
  total_pending: number;    // Count of 'sorting' + 'ready_to_dispatch'
  total_dispatched: number; // Count of 'dispatched' + 'delivered'
  total_delayed: number;    // received/sorting/ready_to_dispatch with updated_at > 2h ago
  total_on_hold: number;    // Count of 'on_hold' + 'cancelled'
}

// SSE event payload types — used by GET /api/shipments/stream
export type NewShipmentEvent = Shipment; // Full Shipment object for local state merge

export interface StatusChangeEvent {
  id: string;
  status: ShipmentStatus;
  timestamp: string; // ISO 8601
}

export interface PriorityUpdateEvent {
  id: string;
  priority: Priority;
  timestamp: string; // ISO 8601
}

// POST /api/ai/route-suggestion request body
export interface RouteSuggestionRequest {
  shipment_id: string;
  shipment_data: Shipment;
}

// Valid status machine transitions — single source of truth for both the mock API
// and candidate UI code. Import this to enforce valid transitions client-side.
export const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  received: ['sorting'],
  sorting: ['ready_to_dispatch', 'on_hold'],
  ready_to_dispatch: ['dispatched'],
  dispatched: ['delivered'],
  delivered: [],
  on_hold: ['sorting', 'cancelled'],
  cancelled: [],
};

// Discriminated union of all SSE event shapes from GET /api/shipments/stream.
// Use the `event` field to narrow the payload type in a switch statement.
export type SSEEvent =
  | { event: 'new_shipment'; data: NewShipmentEvent }
  | { event: 'status_change'; data: StatusChangeEvent }
  | { event: 'priority_update'; data: PriorityUpdateEvent };
