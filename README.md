# GudangKu — Warehouse Shipment Tracker

A take-home assessment for senior frontend engineers. You have **1 hour maximum**.

**Time tracking**
> We analyze commit timestamps. Build incrementally — commit often. Make your first commit when you start working (even if it's just a placeholder).Your last commit should be within 1 hour of your first. We review commit timestamps to verify the time limit.

**Decision.md (Task 4)**
> Take a look at Decision.md which contain the template with section headers and guidance comments, and fill it in as you work. Think of it like an engineering journal — document what AI tool you used for what, why you chose a particular architecture, how you handled the ambiguous requirement, etc.

## Overview

GudangKu is a warehouse management tool used by floor operators on tablets. You'll build a real-time shipment tracking dashboard on top of a pre-built scaffold.

**Context:** Warehouse operators wear gloves and work on 10-inch tablets. Touch targets must be at least 48px. Status indicators must use icons + labels, not color alone (operators may be color-blind or in poor lighting).

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The mock API starts automatically via MSW (Mock Service Worker). No backend setup needed.

---

## Assessment Tasks

### Task 1 — Shipment Tracking Dashboard _(Senior bar)_

Build the main dashboard at `/`.

**Acceptance criteria:**
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

### Task 2 — AI Route Suggestion Panel _(Senior bar)_

Add an AI routing suggestion feature to the dashboard.

**Acceptance criteria:**
- For a selected shipment, call `POST /api/ai/route-suggestion`
- Stream the response **word-by-word** using `response.body.getReader()`
  (this is a `ReadableStream` of raw text — different from the SSE endpoint)
- Display the suggestion as it streams in
- ~30% of suggestions will **contradict** the shipment's priority (e.g., "standard routing" for a critical package). Decide how to handle this in your UI and document your decision in `DECISIONS.md`.

---

### Task 3 — Code Review: `src/components/ai-generated-component.tsx` _(Senior bar)_

This component was AI-generated and contains deliberate bugs. Review it, fix all issues you find, and document your findings.

**Acceptance criteria:**
- Find and fix all bugs (hint: there are 10 issues of varying severity)
- Document each issue in `DECISIONS.md`: what it is, severity, and your fix
- The fixed component should work correctly with all shipments, including those without a carrier phone number

> **Note:** The component is not mounted in the app by default. Import it in `Dashboard.tsx` and render it with a test shipment to verify your fixes work at runtime.

---

### Task 4 — DECISIONS.md _(ongoing)_

Fill in `DECISIONS.md` as you work. This is reviewed alongside your code. See the template for what to include.

---

### Task 5 — Shift Performance Analytics _(Upper Senior+ stretch)_

Build an analytics view at `/performance` for shift managers.

**Attempt only if you have time remaining after Tasks 1–4.**

- Throughput over the shift (shipments processed per hour)
- Bottleneck identification (which status stage has the longest dwell time)
- Carrier performance comparison
- Priority distribution over time

Data source: derive from `GET /api/shipments` using `created_at` / `updated_at`. Document your approach in `DECISIONS.md` Section 6.

---

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

## Submission

Once done, email admin@bukumed.com of your completion. 

**Time limit:** Maximum 1 hours. Tasks 1–4 are the senior bar. Task 5 is Upper Senior stretch — attempt only if time remains.
