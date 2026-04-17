import type { ShipmentStatus, Priority } from '@/api/types';

// ─── Brand colors ─────────────────────────────────────────────────────────────
export const brandColors = {
  primary: '#1B5E20',    // Dark green — warehouse safety / "go"
  secondary: '#E65100',  // Deep orange — urgency / attention
  background: '#FAFAFA', // Light gray
} as const;

// ─── Status colors ────────────────────────────────────────────────────────────
// Colors must NOT be the only differentiator — pair with icons + labels in UI.
export const statusColors = {
  received: '#2196F3',         // Blue
  sorting: '#FF9800',          // Orange
  ready_to_dispatch: '#9C27B0', // Purple
  dispatched: '#00BCD4',       // Cyan
  delivered: '#4CAF50',        // Green
  on_hold: '#F44336',          // Red
  cancelled: '#9E9E9E',        // Gray
} as const satisfies Record<ShipmentStatus, string>;

// ─── Priority colors ──────────────────────────────────────────────────────────
// normal = blue-gray (not green — green is reserved for delivered / positive signals)
export const priorityColors = {
  normal: '#78909C',    // Blue-gray
  urgent: '#FF9800',    // Orange
  critical: '#D32F2F',  // Red
} as const satisfies Record<Priority, string>;
