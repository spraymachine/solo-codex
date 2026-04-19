# Solo Leveling Full App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Solo Leveling personal system beyond the phase-1 shell by shipping Missions, Inventory, Hunter's Record, Player Status, global Dungeon Timer, reminders, and penalty handling on top of the existing local-first foundation.

**Architecture:** Extend the existing Dexie storage layer and Zustand stores so every remaining feature uses the same local-first contracts. Keep the timer, reminder, and penalty logic global so page navigation never breaks active sessions or daily-state checks. Build each route as a focused client page with small reusable panels/forms rather than pushing feature logic into the route files.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Dexie.js, Zustand, Framer Motion, Recharts, Vitest, React Testing Library

---

### Task 1: Expand the data layer for the remaining domains

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/db/storage.ts`
- Create: `src/__tests__/lib/full-storage.test.ts`

- [ ] Add failing tests for mission CRUD, inventory promotion metadata, hunter-record logging, penalty bookkeeping, and gym stat entry persistence.
- [ ] Run `npm test src/__tests__/lib/full-storage.test.ts` and confirm the new tests fail because the storage methods do not exist yet.
- [ ] Implement the missing storage contracts for `missions`, `inventory`, `hunterRecords`, and `gymStats`, including helpers for linked-mission progress and yesterday penalty bookkeeping.
- [ ] Re-run `npm test src/__tests__/lib/full-storage.test.ts` until the new tests pass.

### Task 2: Add stores for the missing feature areas

**Files:**
- Create: `src/lib/stores/missions-store.ts`, `src/lib/stores/inventory-store.ts`, `src/lib/stores/records-store.ts`, `src/lib/stores/stats-store.ts`, `src/lib/stores/timer-store.ts`
- Create: `src/__tests__/lib/records-store.test.ts`, `src/__tests__/lib/missions-store.test.ts`
- Modify: `src/components/store-initializer.tsx`, `src/lib/stores/gates-store.ts`, `src/lib/stores/player-store.ts`

- [ ] Write failing store tests for record logging with streak/XP updates and mission syncing from linked gates.
- [ ] Run the targeted Vitest commands and confirm the failures are about missing store modules or behaviors.
- [ ] Implement the stores so they load from Dexie, coordinate with the existing player/gates stores, and expose minimal actions for the UI.
- [ ] Extend the initializer to load all stores and trigger a once-per-open penalty check plus mission-sync refresh.
- [ ] Re-run the targeted tests and then the full `npm test`.

### Task 3: Ship the global Dungeon Timer and reminder system

**Files:**
- Create: `src/components/system/dungeon-timer-overlay.tsx`, `src/components/system/system-effects.tsx`
- Modify: `src/app/layout.tsx`, `src/components/gates/quest-item.tsx`, `src/app/gates/[id]/page.tsx`

- [ ] Add a failing test for timer-store lifecycle behavior if store-only logic needs coverage.
- [ ] Implement a persisted timer store with start, tick, give-up, and complete actions.
- [ ] Render the overlay globally from the root layout so it survives route changes.
- [ ] Add reminder and notification effects for timer completion and evening log reminders while the tab is open.
- [ ] Wire quest timer actions from the gate detail page into the global timer.

### Task 4: Build Missions and Inventory

**Files:**
- Create: `src/components/missions/mission-card.tsx`, `src/components/missions/mission-form.tsx`, `src/components/inventory/inventory-item-card.tsx`, `src/components/inventory/inventory-form.tsx`, `src/components/inventory/promote-modal.tsx`
- Modify: `src/app/missions/page.tsx`, `src/app/inventory/page.tsx`

- [ ] Build the Missions page with creation, manual progress updates, linked gates, deadlines, and rank display.
- [ ] Build the Inventory page with quick-add, notes/tags, and promotion flows to Gate or Mission while preserving promotion origin metadata.
- [ ] Hook Inventory promotion into the existing gates store and the new missions store.
- [ ] Verify the two routes manually in the browser and then with `npm run build`.

### Task 5: Build Hunter's Record

**Files:**
- Create: `src/components/records/quick-log-form.tsx`, `src/components/records/record-day-card.tsx`, `src/components/records/reflection-form.tsx`, `src/components/records/record-calendar.tsx`, `src/components/ui/penalty-banner.tsx`
- Modify: `src/app/records/page.tsx`, `src/app/page.tsx`

- [ ] Build quick logging for today, optional end-of-day reflection, and a compact calendar/grid view for recent record status.
- [ ] Surface penalty state on both the Records page and Dashboard.
- [ ] Ensure the first log of a day awards XP and updates streaks, while missed days reset streaks once.
- [ ] Re-run tests and manually verify a penalty scenario by seeding yesterday-missing data.

### Task 6: Build Player Status and dashboard enhancements

**Files:**
- Create: `src/components/status/profile-panel.tsx`, `src/components/status/gym-stat-card.tsx`, `src/components/status/gym-stat-form.tsx`, `src/components/status/xp-history-panel.tsx`, `src/components/dashboard/gym-summary.tsx`
- Modify: `src/app/status/page.tsx`, `src/app/page.tsx`

- [ ] Build editable player profile/status controls, gym stat CRUD with trend arrows and charts, and XP history.
- [ ] Add a gym-summary panel to the dashboard and fold in any new status indicators from the global stores.
- [ ] Verify chart rendering and empty-state behavior.

### Task 7: Finish interaction quality and verification

**Files:**
- Modify: feature files touched above as needed

- [ ] Polish quest grouping and ordering behavior inside gate detail so active quests stay above cleared quests and reordering updates persistence.
- [ ] Run `npm run lint`, `npm test`, and `npm run build`.
- [ ] Fix any issues until all three commands pass.

