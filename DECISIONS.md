# DECISIONS.md

---

## 1. AI Tool Usage Log

| Tool | What I Used It For | What I Did Myself |
|---|---|---|
| GitHub Copilot (Claude) | Scaffolded the custom hooks (`useShipments`, `useShipmentStats`, `useShipmentStream`, `useRouteSuggestion`) and the icon/label/color mapping in `shipment-helpers.ts`. | Designed the hook architecture, decided how SSE events should update the React Query cache (setQueriesData vs invalidate), picked the contradiction-detection keywords after reading the mock data. |
| GitHub Copilot (Claude) | Generated the Dashboard JSX — stat cards, filter selects, shipment table rows. | Gave it explicit constraints: 48px touch targets, icon+label on every chip, MUI Table layout. Reviewed for accessibility compliance, fixed the state flow between filters and the selected-shipment drawer. |
| GitHub Copilot (Claude) | Wrote the streaming Drawer panel for AI route suggestions. | I came up with the contradiction UX (show warning, don't suppress). Picked the keyword list by studying what the mock endpoint actually returns for urgent/critical shipments. |
| GitHub Copilot (Claude) | Rewrote the fixed version of `ai-generated-component.tsx` after I identified all the bugs. | I found every bug myself by reading the code line by line. Decided the fix approach for each (e.g., remove the reset button entirely instead of "fixing" it, because prop mutation + no server call = wrong pattern). AI just typed the replacement code faster. |
| GitHub Copilot (Claude) | Generated responsive layout refactor — CSS Grid stat cards, mobile card list, `useMediaQuery` breakpoints for both Dashboard and Performance pages. | I decided the breakpoint strategy (cards on phone, table on tablet+), the grid column counts (2/3/5), and the visual direction (flat cards with tinted backgrounds). Reviewed touch target compliance. |

---

## 2. Architectural Decisions

### State management: React Query + local useState

Went with React Query for everything server-related (shipments, stats). UI-only state like selected shipment and filter values stays in `useState` — no need for a global store when the data flows are this simple.

The key call was how to handle SSE: instead of refetching on every event, I update the React Query cache directly with `setQueriesData`. The SSE payloads are self-contained (they include the full updated fields), so there's no reason to hit the network again. Stats get invalidated rather than computed client-side, because `total_delayed` is cross-cutting and I didn't want to replicate the server's aggregation logic.

I considered Redux/Zustand but it'd be overkill here — React Query already handles caching, deduplication, and background refresh. Adding a global store would just mean writing manual cache invalidation that React Query does for free.

### SSE connection

Single `EventSource` in a `useShipmentStream` hook. Three event types → three cache update strategies:
- `new_shipment`: append to the `['shipments']` array
- `status_change`: find-and-update in place
- `priority_update`: find-and-update in place

All three invalidate `['stats']` so the stat cards recompute server-side.

I chose to invalidate stats rather than update them client-side because the stat aggregation isn't trivial (e.g., `total_delayed` depends on time thresholds). Keeping that on the server avoids drift.

### Component structure

Dashboard is one page component that orchestrates everything. Data fetching lives in hooks, display config (icons, labels, colors per status/priority) lives in `shipment-helpers.ts`. This way the same status chip looks identical whether it's in the table, the drawer, or the modal.

The helpers always pair an icon with a text label — never color alone. This is the README's accessibility rule for color-blind operators in poor warehouse lighting.

### Mobile responsive approach

The original layout broke badly on phones — stat cards stacked into one tall column, the 7-column table overflowed, filter dropdowns had fixed widths that didn't fit.

Fix: CSS Grid for stat cards (`repeat(2, 1fr)` on mobile → `repeat(5, 1fr)` on desktop). For the shipment list, I render a card-based layout on screens under 600px and the full table on tablet+. Detected with `useMediaQuery(theme.breakpoints.down('sm'))`.

Why cards instead of a scrollable table? Gloved operators on phones shouldn't need to horizontal-scroll through 7 columns. A card shows the essential info (ID, status chip, priority chip, carrier, destination, weight) in a compact vertical layout that's easy to tap.

Stat cards use Grid instead of flex-wrap because Grid gives precise column counts — flex-wrap creates uneven card widths when items wrap, which looked messy.

---

## 3. Ambiguous Requirement Decision

**The problem:** ~30% of AI route suggestions contradict the shipment's priority (e.g., "standard routing, no rush" for a critical package).

**My approach:** Show the suggestion in full, but slap a visible amber warning on it when contradiction is detected. The warning says: _"This suggestion may conflict with the shipment's **{priority}** priority. Review before acting."_

Detection is simple keyword matching after the stream finishes — phrases like "no priority handling", "low-priority", "48 hours", "no rush", "delay acceptable", "economy batch" trigger the warning on urgent/critical shipments. Normal-priority shipments never warn.

**Reasoning:**

Warehouse operators know their floor better than the AI. Suppressing a contradictory suggestion means they lose information — and occasionally the "contradictory" suggestion might actually be valid (maybe the shipment was just reclassified). So show everything, but make sure the mismatch is impossible to miss.

The amber Alert uses icon + color + text, which satisfies the accessibility requirement (not color alone).

**What I didn't do:**
- Auto-reject and re-fetch: with a 30% contradiction rate this could loop multiple times. Wastes the operator's time.
- Silently show it without warning: too risky for critical shipments. Operators could follow bad routing without realizing.
- Block the suggestion entirely: too restrictive. The operator should decide.

---

## 4. AI Code Review (Task 3)

Found all 10 issues in `ai-generated-component.tsx`:

| # | What's Wrong | Severity | How I Fixed It |
|---|---|---|---|
| 1 | `shipment: any` — no type safety at all | Medium | Changed to `Shipment` from `@/api/types` |
| 2 | `shipment.carrier.phone.split('-')` crashes when phone is undefined (AnterAja has no phone) | **Critical** | Null check in `useMemo`, returns `'N/A'` for missing phone |
| 3 | `useEffect` with no dependency array → infinite fetch loop (fetch → setState → rerender → fetch → ...) | **Critical** | Added `[shipment.id, open]` deps + early return when modal is closed |
| 4 | `response.text()` reads the whole response at once — spec says stream word-by-word with `getReader()` | Medium | Rewrote with `getReader()` + `TextDecoder` chunked reading |
| 5 | `useMemo` for status display has `[]` deps but reads `shipment.status` — goes stale after SSE updates | High | Fixed deps to `[shipment.status]` |
| 6 | `handleResetStatus` does `shipment.status = 'received'` — mutates props directly, no server call, bypasses status machine | High | Removed the button entirely. Status changes should go through `PATCH /api/shipments/:id/status` |
| 7 | `dangerouslySetInnerHTML` on user-supplied notes field — SHP-013 literally has `<script>alert("xss")</script>` in its notes | **Critical** | Plain `<Typography>` text rendering. No HTML. |
| 8 | Close button is a bare `<div>` — no keyboard nav, no ARIA label, no focus indicator, doesn't hit 48px target | Medium | MUI `<IconButton>` with `aria-label="Close"` (picks up 48px from theme) |
| 9 | No error handling on the fetch — network failures → unhandled promise rejection | Medium | try/catch with error state shown in the UI |
| 10 | Unused `Tooltip` import with an `eslint-disable-line` to suppress the warning | Low | Deleted both |

Bug #6 was an interesting call — I could've "fixed" it by wiring up the PATCH endpoint, but that would add a feature that wasn't asked for and the status machine transitions are complex. Removing the button is the safer choice under time pressure.

---

## 5. Trade-offs & Time Allocation

- Task 1 (dashboard): ~20 min — hooks, helpers, stat cards, filters, table, SSE wiring
- Task 2 (AI panel): ~10 min — streaming drawer + contradiction warning
- Task 3 (code review): ~12 min — found 10 bugs, fixed, integrated modal into Dashboard
- Task 4 (this doc): updated at every commit
- Task 5 (analytics): ~10 min — performance page with throughput, bottleneck, carrier, priority views
- Polish: ~8 min — mobile responsive layout, CSS Grid stat cards, card-based mobile list, visual cleanup

**Commit history:** setup → core dashboard + SSE → AI panel → bug fixes → docs → performance analytics → mobile responsive polish. Each commit was a working increment.

**With more time I'd add:**

- Tests for the hooks, especially the SSE cache update logic and contradiction keyword matching
- Virtualized scrolling — 15 shipments is fine, 500+ would need `react-window` or similar
- Status transition UI wired to `PATCH /api/shipments/:id/status` with the status machine
- Snackbar/toast for SSE events so operators see changes even when scrolled down
- Recharts or similar for the Performance page — tables work but charts are easier to scan
- Keyboard navigation in the shipment table (arrow keys, Enter to select/deselect)

---

## 6. Task 5: Shift Performance

**What I built and why:**

1. **Throughput (shipments/hour):** Bucketed by `created_at` hour. Tells shift managers when the warehouse is busiest → staffing decisions.
2. **Bottleneck identification:** Average dwell time per status, sorted longest first. The top row is where shipments are getting stuck. Highlighted in red.
3. **Carrier comparison:** Delivered count, on-hold/cancelled count, delivery rate per carrier. Quick way to spot underperformers.
4. **Priority distribution:** Count + percentage for critical/urgent/normal. Cards with icons for fast scanning.

**How I computed it:**

- Throughput: `new Date(created_at).getHours()` → group and count.
- Bottleneck: `(updated_at - created_at)` in minutes, averaged per status. This is an approximation — `updated_at` is the last modification time, not when the shipment entered its current status. You'd really need a status transition history for accurate per-stage timing.
- Carrier: group by `carrier.name`, count delivered vs on-hold/cancelled.

**Assumptions:**

- Dwell time approximation is "good enough" without a transition history table
- "Throughput" = created per hour, not completed per hour (would need `delivered_at` for that)
- Everything computed client-side from the same `GET /api/shipments` data — no extra endpoint needed
- Used MUI Table + LinearProgress bars instead of adding a chart library — keeps deps light
