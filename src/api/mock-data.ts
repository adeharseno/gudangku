import type { Shipment, Priority } from './types';

// ─── Carrier definitions ────────────────────────────────────────────────────

const CARRIERS = {
  JNE: {
    name: 'JNE Express',
    phone: '021-5655-5630',
    tracking_url: 'https://www.jne.co.id/tracking',
  },
  SiCepat: {
    name: 'SiCepat',
    phone: '021-5039-9999',
    tracking_url: 'https://www.sicepat.com/checkAwb',
  },
  // AnterAja has no phone — this is intentional for the flawed component bug (issue #2)
  AnterAja: {
    name: 'AnterAja',
    tracking_url: 'https://anteraja.id/tracking',
  },
  PosIndonesia: {
    name: 'Pos Indonesia',
    phone: '021-161',
    tracking_url: 'https://www.posindonesia.co.id/tracking',
  },
} as const;

// ─── Seed shipments ──────────────────────────────────────────────────────────
// 15 shipments • all 7 statuses • priorities: 9 normal / 5 urgent / 1 critical
// Edge cases annotated inline

export const seedShipments: Shipment[] = [
  // ── RECEIVED (3) ──────────────────────────────────────────────────────────
  {
    id: 'SHP-001',
    tracking_id: 'JNE123456789012',
    status: 'received',
    priority: 'normal',
    sender: 'Toko Elektronik Maju',
    recipient: 'PT. Logistik Nusantara',
    destination: 'Zone A - Rack 12',
    carrier: CARRIERS.JNE,
    weight_kg: 3.5,
    package_count: 2,
    notes: 'Handle with care — electronic components inside',
    created_at: '2026-04-06T06:15:00Z',
    updated_at: '2026-04-06T06:20:00Z',
  },
  {
    // Edge case: updated_at > 2h ago → counts toward total_delayed in stats
    id: 'SHP-002',
    tracking_id: 'SCP987654321098',
    status: 'received',
    priority: 'urgent',
    sender: 'Pabrik Tekstil Sejahtera',
    recipient: 'Butik Mode Jakarta',
    destination: 'Zone B - Staging',
    carrier: CARRIERS.SiCepat,
    weight_kg: 12.0,
    package_count: 5,
    notes: 'Seasonal collection — time-sensitive delivery',
    created_at: '2026-04-06T06:30:00Z',
    updated_at: '2026-04-06T07:30:00Z', // > 2h old → delayed
  },
  {
    // Edge case: carrier.phone is undefined (AnterAja) — triggers flawed component crash (issue #2)
    id: 'SHP-003',
    tracking_id: 'AAJ112233445566',
    status: 'received',
    priority: 'normal',
    sender: 'Distributor Farmasi Utama',
    recipient: 'Apotek Sehat Selalu',
    destination: 'Zone C - Cold Storage',
    carrier: CARRIERS.AnterAja,
    weight_kg: 0.8,
    package_count: 1,
    notes: 'Temperature-sensitive medication — keep refrigerated',
    created_at: '2026-04-06T07:00:00Z',
    updated_at: '2026-04-06T07:05:00Z',
  },

  // ── SORTING (3) ───────────────────────────────────────────────────────────
  {
    // Edge case: updated_at > 2h ago AND critical priority → delayed critical shipment
    id: 'SHP-004',
    tracking_id: 'JNE456789012345',
    status: 'sorting',
    priority: 'critical',
    sender: 'RS. Harapan Bunda',
    recipient: 'Laboratorium Medika',
    destination: 'Zone A - Priority Bay',
    carrier: CARRIERS.JNE,
    weight_kg: 1.2,
    package_count: 1,
    notes: 'Medical specimens — do not delay processing',
    created_at: '2026-04-06T07:15:00Z',
    updated_at: '2026-04-06T08:00:00Z', // > 2h old → delayed
  },
  {
    id: 'SHP-005',
    tracking_id: 'SCP555666777888',
    status: 'sorting',
    priority: 'urgent',
    sender: 'CV Bangunan Jaya',
    recipient: 'Proyek Konstruksi Mega',
    destination: 'Zone D - Heavy Cargo',
    carrier: CARRIERS.SiCepat,
    weight_kg: 45.0,
    package_count: 8,
    created_at: '2026-04-06T08:30:00Z',
    updated_at: '2026-04-06T09:15:00Z',
  },
  {
    id: 'SHP-006',
    tracking_id: 'POS334455667788',
    status: 'sorting',
    priority: 'normal',
    sender: 'Percetakan Arta',
    recipient: 'Kantor Pusat BNI',
    destination: 'Zone B - Documents',
    carrier: CARRIERS.PosIndonesia,
    weight_kg: 2.3,
    package_count: 3,
    notes: 'Confidential documents — secure handling required',
    created_at: '2026-04-06T09:00:00Z',
    updated_at: '2026-04-06T09:45:00Z',
  },

  // ── READY_TO_DISPATCH (2) ─────────────────────────────────────────────────
  {
    // Edge case: very long tracking_id (38 chars) — tests text overflow handling
    id: 'SHP-007',
    tracking_id: 'JNE-EXPRESS-INTL-2026040600789012345678',
    status: 'ready_to_dispatch',
    priority: 'urgent',
    sender: 'Samsung Electronics Indonesia',
    recipient: 'iBox Central Park',
    destination: 'Zone A - Express Dock',
    carrier: CARRIERS.JNE,
    weight_kg: 8.5,
    package_count: 4,
    notes: 'Consumer electronics — fragile, this side up',
    created_at: '2026-04-06T09:30:00Z',
    updated_at: '2026-04-06T10:30:00Z',
  },
  {
    // AnterAja — no carrier phone
    id: 'SHP-008',
    tracking_id: 'AAJ998877665544',
    status: 'ready_to_dispatch',
    priority: 'normal',
    sender: 'Toko Buku Gramedia',
    recipient: 'Perpustakaan Nasional',
    destination: 'Zone B - Standard Dock',
    carrier: CARRIERS.AnterAja,
    weight_kg: 18.0,
    package_count: 6,
    created_at: '2026-04-06T10:00:00Z',
    updated_at: '2026-04-06T10:45:00Z',
  },

  // ── DISPATCHED (2) ────────────────────────────────────────────────────────
  {
    id: 'SHP-009',
    tracking_id: 'SCP111222333444',
    status: 'dispatched',
    priority: 'normal',
    sender: 'Pabrik Garmen Sentosa',
    recipient: 'Departemen Store Matahari',
    destination: 'Jl. Sudirman No. 45, Jakarta',
    carrier: CARRIERS.SiCepat,
    weight_kg: 25.0,
    package_count: 10,
    created_at: '2026-04-06T08:00:00Z',
    updated_at: '2026-04-06T11:00:00Z',
  },
  {
    id: 'SHP-010',
    tracking_id: 'POS667788991122',
    status: 'dispatched',
    priority: 'urgent',
    sender: 'Otomotif Parts Center',
    recipient: 'Bengkel Auto Prima',
    destination: 'Jl. Gatot Subroto No. 12, Jakarta',
    carrier: CARRIERS.PosIndonesia,
    weight_kg: 32.5,
    package_count: 3,
    notes: 'Automotive parts — handle with care',
    created_at: '2026-04-06T07:30:00Z',
    updated_at: '2026-04-06T10:00:00Z',
  },

  // ── DELIVERED (2) ─────────────────────────────────────────────────────────
  {
    // Edge case: delivered_at is set — tests optional field handling
    id: 'SHP-011',
    tracking_id: 'JNE000111222333',
    status: 'delivered',
    priority: 'normal',
    sender: 'Supplier Kantor Abadi',
    recipient: 'PT. Teknologi Maju',
    destination: 'Gedung Bursa Efek Lt. 3',
    carrier: CARRIERS.JNE,
    weight_kg: 5.5,
    package_count: 2,
    notes: 'Office supplies — delivered successfully',
    created_at: '2026-04-06T06:00:00Z',
    updated_at: '2026-04-06T12:00:00Z',
    delivered_at: '2026-04-06T12:00:00Z',
  },
  {
    id: 'SHP-012',
    tracking_id: 'SCP444555666777',
    status: 'delivered',
    priority: 'normal',
    sender: 'Kue & Catering Nusantara',
    recipient: 'Hotel Grand Hyatt',
    destination: 'Jl. MH Thamrin No. 28',
    carrier: CARRIERS.SiCepat,
    weight_kg: 15.0,
    package_count: 7,
    created_at: '2026-04-06T07:45:00Z',
    updated_at: '2026-04-06T11:30:00Z',
    delivered_at: '2026-04-06T11:30:00Z',
  },

  // ── ON_HOLD (2) ───────────────────────────────────────────────────────────
  {
    // Edge case: notes contains HTML + script tag — feeds dangerouslySetInnerHTML XSS bug (issue #9)
    id: 'SHP-013',
    tracking_id: 'AAJ321654987123',
    status: 'on_hold',
    priority: 'normal',
    sender: 'Vendor Promosi XYZ',
    recipient: 'Marketing Dept. Tokopedia',
    destination: 'Zone C - Holding Bay',
    carrier: CARRIERS.AnterAja,
    weight_kg: 4.0,
    package_count: 2,
    notes: 'Promotional materials<br/><b>URGENT</b><script>alert("xss")</script>',
    created_at: '2026-04-06T10:30:00Z',
    updated_at: '2026-04-06T11:00:00Z',
  },
  {
    id: 'SHP-014',
    tracking_id: 'POS112233445566',
    status: 'on_hold',
    priority: 'urgent',
    sender: 'Importir Elektronik Global',
    recipient: 'Customs Inspection - Soekarno Hatta',
    destination: 'Zone A - Customs Hold',
    carrier: CARRIERS.PosIndonesia,
    weight_kg: 22.0,
    package_count: 5,
    notes: 'Held for customs clearance — awaiting documentation',
    created_at: '2026-04-06T11:00:00Z',
    updated_at: '2026-04-06T11:30:00Z',
  },

  // ── CANCELLED (1) ─────────────────────────────────────────────────────────
  {
    // Edge case: terminal state, no delivered_at, notes is undefined
    id: 'SHP-015',
    tracking_id: 'POS778899001122',
    status: 'cancelled',
    priority: 'normal',
    sender: 'Toko Online Flash Sale',
    recipient: 'Pelanggan Membatalkan',
    destination: 'Zone B - Return Area',
    carrier: CARRIERS.PosIndonesia,
    weight_kg: 1.5,
    package_count: 1,
    created_at: '2026-04-06T09:15:00Z',
    updated_at: '2026-04-06T10:30:00Z',
  },
];

// ─── Shipment factory for SSE new_shipment events ────────────────────────────
// IDs start at SHP-016 and increment per session

let nextShipmentIndex = 16;

const SENDER_POOL = [
  'Distributor Barang Elektronik',
  'Pabrik Makanan Sehat',
  'Toko Fashion Online',
  'Supplier Alat Kesehatan',
  'CV Kerajinan Tangan Nusantara',
];

const RECIPIENT_POOL = [
  'Gudang Pusat Jakarta',
  'Retail Store Bandung',
  'Pelanggan End-User',
  'Agen Distribusi Surabaya',
  'Kantor Cabang Medan',
];

const DESTINATION_POOL = [
  'Zone A - Receiving Bay',
  'Zone B - General Intake',
  'Zone C - Express Intake',
  'Zone D - Heavy Cargo Intake',
];

const CARRIER_POOL = [
  CARRIERS.JNE,
  CARRIERS.SiCepat,
  CARRIERS.AnterAja,
  CARRIERS.PosIndonesia,
];

function pick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick() called with empty array');
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickPriority(): Priority {
  const r = Math.random();
  if (r < 0.6) return 'normal';
  if (r < 0.9) return 'urgent';
  return 'critical';
}

export function createNewShipment(): Shipment {
  const id = `SHP-${String(nextShipmentIndex).padStart(3, '0')}`;
  nextShipmentIndex++;
  const now = new Date().toISOString();
  return {
    id,
    tracking_id: `NEW${Date.now()}${Math.floor(Math.random() * 10000)}`,
    status: 'received',
    priority: pickPriority(),
    sender: pick(SENDER_POOL),
    recipient: pick(RECIPIENT_POOL),
    destination: pick(DESTINATION_POOL),
    carrier: pick(CARRIER_POOL),
    weight_kg: Math.round((0.5 + Math.random() * 49.5) * 10) / 10,
    package_count: Math.floor(1 + Math.random() * 8),
    created_at: now,
    updated_at: now,
  };
}

// ─── AI routing suggestion bank ──────────────────────────────────────────────
// normal: priority-appropriate suggestions
// contradiction: intentionally contradict shipment priority (~30% selection rate)
// At least 3 contradictions required per spec — the ambiguous UX requirement candidates must address

export const ROUTE_SUGGESTIONS = {
  normal: [
    'Route via Express Lane A — estimated delivery in 2 hours',
    'Priority handling confirmed — direct to Gate 7 for immediate dispatch',
    'Cold storage routing recommended — fragile contents detected, maintain below 8°C',
    'Standard routing via Dock 3 — scheduled delivery window 4 to 6 hours',
    'Bulk consolidation route — merge with outbound batch at Staging Area B',
    'Oversized package protocol — requires forklift clearance at Bay 12',
  ],
  contradiction: [
    'Standard ground routing — no priority handling needed',
    'Low-priority queue assignment — estimated dispatch within 48 hours',
    'Economy batch shipment — combine with next available truck, no rush',
    'Delay acceptable — route to overflow storage pending carrier availability',
  ],
} as const;
