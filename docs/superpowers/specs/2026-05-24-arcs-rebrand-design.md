# Arcs Rebrand Design

**Date:** 2026-05-24  
**Status:** Approved

---

## Overview

Rebrand "three week arcs" → **Arcs**. Arcs get flexible date ranges (user picks start + end), two progress bars per card, and the existing calendar gains month navigation to browse past arcs with their daily todos and logs.

No Supabase data deleted. All changes are additive.

---

## 1. Arc Card Design

**Layout:** Side-by-side stat tiles + thin 5px rank-colored left stripe (V1+B).

Each arc card renders:

```
┌─┬──────────────────────────────────────────┐
│█│ Self-Improv               [Active badge]  │
│█│ Apr 20 – May 11 · S Rank                 │
│█│ ┌────────────────┐  ┌────────────────┐   │
│█│ │ TIME ELAPSED   │  │ STEPS DONE     │   │
│█│ │ 62%            │  │ 2/5            │   │
│█│ │ ▓▓▓▓▓▓░░░░░   │  │ ▓▓░░░░░░░░░   │   │
│█│ │ Due May 11     │  │ 3 remaining    │   │
│█│ └────────────────┘  └────────────────┘   │
└─┴──────────────────────────────────────────┘
```

- Left stripe color = rank (S→gold, A→blue, B→green, C→amber, D→red, E→brown)
- Time tile: `(today - startDate) / (endDate - startDate)` × 100, clamped 0–100
- Steps tile: `completedSubTodos / totalSubTodos`, shows "N remaining"
- If no steps: steps tile shows "No steps added"
- Cleared arc: existing X overlay retained, badge shows "Cleared"

---

## 2. Arc Creation

"Create Arc" button in the Arcs section on the home page opens a modal with:

- **Title** — text input
- **Rank** — S/A/B/C/D/E picker (same as existing goal rank UI)
- **Start date** — date input, defaults to today
- **End date** — date input, required, must be after start date

On submit: calls `createGate` with `date = startDate`, `endDate = endDate`. The arc appears in the grid immediately.

Existing arcs (Apr 20–May 11 campaign goals) are treated as arcs with `endDate = 2026-05-11`.

---

## 3. DB Schema Change

Add `end_date` column to `solo_goals` (Supabase). Additive only.

```sql
ALTER TABLE solo_goals ADD COLUMN end_date date;
```

- Existing rows: `end_date = NULL` → frontend defaults to `date + 21 days` for display
- New arcs: `end_date` set explicitly on creation
- `solo_goals.date` = arc start date (field meaning unchanged, no migration needed)

Update `Gate` type in `src/lib/types.ts`:

```ts
export interface Gate {
  // ... existing fields ...
  endDate: string | null; // null = legacy, treat as startDate + 21 days
}
```

Cloud sync (`cloud-sync.tsx`) maps DB `end_date` ↔ frontend `endDate`.

---

## 4. Month Navigation

The existing "04 Calendar" section keeps its current grid layout exactly. Changes:

- Add `‹` / `›` arrow buttons to the calendar header to shift the viewed month
- Calendar re-renders showing all days in the selected month (full month, not just the continuation range)
- Days within any arc's date range are visually highlighted (light tint)
- Clicking any day selects it → existing selectedDate logic drives todos + logs display below
- Above the calendar grid: compact arc rows for arcs active in that month (start or end falls within the month, or arc spans across it)

Arc row format (compact, above grid):
```
[stripe] Self-Improv · Apr 20 – May 11 · 62% time · 2/5 steps
```

Navigation behavior:
- Default view: current month (same as today)
- `‹` → previous month, `›` → next month (no future limit beyond current month)
- Navigating month does NOT change `selectedDate` — selectedDate persists
- If selectedDate is not in viewed month, it stays selected but calendar shows current month's grid

Month state lives in a local React `useState` — no new store needed.

---

## 5. Home Page Section Changes

| Before | After |
|---|---|
| "02 Finished arc" — locked campaign only | "02 Arcs" — all arcs, create button, month nav calendar |
| Fixed 22-day campaign dates | Flexible per-arc start+end |
| "No 3-week goals yet" empty state | "No arcs yet. Create one to start tracking." |
| "Three-week progress" in mini status | "Arcs progress" — cleared arcs / total arcs |

Text replacements (no logic change):
- "three-week arc" / "3-week arc" / "campaign" → "arc" where appropriate
- "Goals cleared out of the current campaign window" → "Arcs cleared"

---

## 6. What Does NOT Change

- `gates-store.ts` store shape (except `endDate` field added)
- `campaign-store.ts` — kept as-is, still drives the locked Apr 20–May 11 arc data
- `continuation-store.ts` — kept as-is
- Daily todos (missions), logs, reflections, gratitude — unchanged
- Cloud sync logic — only `end_date` field mapping added
- Gates/quests pages — unchanged
- All existing Supabase data — no rows deleted or modified

---

## 7. Out of Scope

- Arc-level analytics page
- Multiple personas having separate arc views (already works via persona store)
- Reordering arcs
- Arc templates
