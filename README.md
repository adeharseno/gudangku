# GudangKu — Warehouse Shipment Tracker

## Overview

GudangKu is a warehouse management tool used by floor operators on tablets. Real-time shipment tracking dashboard on top of a pre-built scaffold.

**Context:** Warehouse operators wear gloves and work on 10-inch tablets. Touch targets must be at least 48px. Status indicators must use icons + labels, not color alone (operators may be color-blind or in poor lighting).

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The mock API starts automatically via MSW (Mock Service Worker). No backend setup needed.

---

### 1 — Shipment Tracking Dashboard

Main dashboard at `/`.
- Fetch and display shipments from `GET /api/shipments`
- Show status, priority, carrier, destination, and package count
- Filter by status and/or priority
- Connect to `GET /api/shipments/stream` (SSE) and update the UI live:
  - `new_shipment` — add to list
  - `status_change` — update status in place
  - `priority_update` — update priority in place
- Display stat cards using `GET /api/shipments/stats`
- Status indicators: icons + labels (never color alone)
- All interactive elements: minimum 48px touch target

---

### 2 — AI Route Suggestion Panel

Add an AI routing suggestion feature to the dashboard.
- For a selected shipment, call `POST /api/ai/route-suggestion`
- Stream the response **word-by-word** using `response.body.getReader()`
  (this is a `ReadableStream` of raw text — different from the SSE endpoint)
- Display the suggestion as it streams in
- ~30% of suggestions will **contradict** the shipment's priority (e.g., "standard routing" for a critical package). Decide how to handle this in your UI and document your decision in `DECISIONS.md`.

---

### 3 — Code Review: `src/components/ai-generated-component.tsx`

This component was AI-generated and contains deliberate bugs. Review it, fix all issues you find, and document your findings.

---


### 4 — Shift Performance Analytics

Analytics view at `/performance` for shift managers.


## API Reference

Base URL: `http://localhost:5173` (all requests intercepted by MSW in development)

### GET /api/shipments

Returns today's shipments.

Query params (optional, AND logic if both provided):
- `?status=received` — filter by status
- `?priority=urgent` — filter by priority

```
GET /api/shipments?status=sorting&priority=urgent
→ 200 Shipment[]
```

---

### PATCH /api/shipments/:id/status

Updates a shipment's status. Validates against the status machine — returns 400 for invalid transitions.

```
PATCH /api/shipments/SHP-004/status
Body: { "status": "ready_to_dispatch" }

→ 200 Shipment (updated)
→ 400 { "error": "Invalid transition from 'received' to 'ready_to_dispatch'" }
→ 404 { "error": "Shipment SHP-999 not found" }
```

---

### GET /api/shipments/stream

Server-Sent Events stream. Emits events every 3–8 seconds.

```
GET /api/shipments/stream
Content-Type: text/event-stream

event: status_change
data: {"id":"SHP-004","status":"ready_to_dispatch","timestamp":"2026-04-06T10:30:00Z"}

event: new_shipment
data: { ...full Shipment object... }

event: priority_update
data: {"id":"SHP-007","priority":"critical","timestamp":"2026-04-06T11:00:00Z"}
```

Connect with `EventSource`. Event data is always self-contained — you can update local state without re-fetching.

---

### POST /api/ai/route-suggestion

Streams a routing suggestion word-by-word as raw text (not SSE).

```
POST /api/ai/route-suggestion
Body: { "shipment_id": "SHP-007", "shipment_data": { ...Shipment } }

→ 200 ReadableStream (text/plain)
   Streams: "Route " "via " "Express " "Lane " "A " "— " ...
→ 400 { "error": "Missing shipment_id or shipment_data in request body" }
```

Consume with `response.body.getReader()`, not `EventSource`.

---

### GET /api/shipments/stats

Returns daily aggregate statistics.

```
GET /api/shipments/stats
→ 200 {
    "total_received": 3,
    "total_pending": 5,
    "total_dispatched": 4,
    "total_delayed": 2,
    "total_on_hold": 3
  }
```

**Note:** Stats fields are aggregated categories, not 1:1 with shipment statuses:

| Field | Computed from |
|---|---|
| `total_received` | `status === 'received'` |
| `total_pending` | `sorting` + `ready_to_dispatch` |
| `total_dispatched` | `dispatched` + `delivered` |
| `total_delayed` | received/sorting/ready_to_dispatch with `updated_at` > 2h ago |
| `total_on_hold` | `on_hold` + `cancelled` |

`total_delayed` is cross-cutting — a shipment counted in `total_delayed` is also counted in `total_received` or `total_pending`.

---

## Status Machine

Valid transitions only. `PATCH /api/shipments/:id/status` returns 400 for anything else.

```
received ──────────────→ sorting
                           │
              ┌────────────┤
              ↓            ↓
         ready_to_dispatch  on_hold
              │              │
              ↓         ┌───┴───┐
          dispatched    ↓       ↓
              │       sorting  cancelled (terminal)
              ↓
          delivered (terminal)
```

Terminal states: `delivered`, `cancelled` — no further transitions.

---

## Tech Stack

| Library | Version | Docs |
|---|---|---|
| React | 18 | [react.dev](https://react.dev) |
| TypeScript | 5 (strict) | [typescriptlang.org](https://www.typescriptlang.org/docs/) |
| Vite | 5 | [vitejs.dev](https://vitejs.dev) |
| MUI | 5 | [mui.com/material-ui](https://mui.com/material-ui/getting-started/) |
| TanStack React Query | 5 | [tanstack.com/query](https://tanstack.com/query/latest) |
| React Router | 6 | [reactrouter.com](https://reactrouter.com/en/main) |
| MSW | 2 | [mswjs.io](https://mswjs.io/docs/) |

---

**Time limit:** Maximum 1 hours. Tasks 1–4 are the senior bar. Task 5 is Upper Senior stretch — attempt only if time remains.
