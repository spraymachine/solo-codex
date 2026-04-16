# Solo Leveling Personal System — Design Spec

A personal productivity web app themed around the Solo Leveling anime's System UI. The user is the Player. Projects are Gates, todos are Quests, long-term goals are Missions, and gym progress is tracked as Player Stats. Built local-first with a sync-ready data layer for future multi-device access.

## Core Metaphor

| Real Life | App Metaphor |
|---|---|
| Profile & gym stats | **Player Status Window** |
| Projects & studies | **Gates** (ranked E through S by scope/difficulty) |
| Todos within a project | **Quests** inside a gate (with nested sub-quests) |
| Daily journal | **Hunter's Record** |
| Goals & targets | **Missions** (long-term, trackable progress bars) |
| Things I started | **Inventory** (living list, promotable to Mission or Gate) |
| Focus timer | **Dungeon Timer** (countdown overlay) |
| XP, streaks, levels | **Player XP & Rank** |

## Navigation

- Desktop: persistent side rail
- Mobile: bottom tab bar
- Sections: Dashboard, Gates, Missions, Inventory, Hunter's Record, Player Status

## Visual Design Language

An interpretation of Solo Leveling's aesthetic, not a copy.

- **Backgrounds:** Deep charcoal / near-black
- **Accents:** Electric blue (primary), violet (XP/level), amber (warnings), red (penalties), emerald (completions)
- **Typography:** Clean sans-serif for body. Monospace for stats, XP numbers, timer — the "System message" feel.
- **Panels:** Subtle translucent glass effect with thin glowing borders (1px + box-shadow glow). Holographic readout energy.
- **Micro-interactions:** XP gains float upward and fade. Level-ups trigger a full-screen flash + rank display. Gate completions play a "Gate Cleared" animation. Penalty notices slide in styled as System warnings.
- **Responsive:** Panels stack vertically on mobile. Gate/quest cards go full-width. Timer overlay works identically on both form factors.

## Features

### Dashboard (Home)

At a glance:
- Player card: name, current rank, level, XP bar to next level
- Today's status: log streak, whether today is logged, active gate count
- Active quests: top in-progress quests across all gates
- Gym stats summary: key lifts with recent trend arrows
- Penalty banner: if a day was missed, a persistent red System warning showing XP lost

### Gates (Projects & Studies)

Each gate is a project or study area.

- **Rank:** E/D/C/B/A/S — user-assigned based on scope/difficulty
- **Status:** Locked (not started), Active (entered), Cleared (completed), Failed (abandoned)
- **Progress bar:** based on quest completion inside it
- **Quests inside:** the todos for this gate
  - Title, description, priority level
  - Nested sub-quests (checklist items within a quest)
  - XP reward
  - Status: Available, In Progress, Completed
  - Optional timer — start a Dungeon Timer scoped to this quest
- **Gate view:** Quests displayed as a vertical mission briefing scroll grouped by status, not horizontal kanban columns. Drag to reorder. Completed quests collapse to bottom with "Cleared" tag.

### Missions (Goals & Targets)

Long-term goals with measurable targets:
- Title + target metric (e.g., "Bench 100kg" with current/target values)
- Progress bar, updated manually or via linked gate quests
- Optional deadline
- Linked gates — completing quests in a linked gate can auto-advance mission progress
- Rank assigned based on ambition

### Inventory (Things I Started)

Low-friction living list:
- Each item: name, date started, optional notes, optional tags
- **Promote to Mission** — one click, converts to a Mission with a target
- **Promote to Gate** — converts to a gate where quests can be added
- Promoted items leave a trace showing their origin

### Hunter's Record (Daily Journal)

- **Quick log entries:** Timestamped bullet-style entries added throughout the day. Minimal friction — tap, type, enter.
- **End-of-day reflection (optional):** Collapsible section with prompts. Never forced.
- **Calendar view:** Days are logged (green glow), missed (red glow / cracked), or partial.
- **Penalty system:** On next app open after midnight, if no entry exists for the previous day:
  - Lose XP (configurable amount)
  - Streak counter resets to 0
  - A "Penalty Notice" appears styled as a System warning

### Dungeon Timer (Focus Overlay)

- Triggered from any quest or via a floating action button
- Translucent dark overlay with large countdown timer (monospace, glowing)
- Shows: quest name, time remaining, "Give Up" and "Complete" buttons
- Time expiry triggers a dungeon-clear-style notification. XP awarded if marked complete.
- Persists across page navigation — global overlay, not page-specific
- Same experience on mobile (full screen overlay)

### Player Status (Stats & Leveling)

- **XP & Level:** Actions earn XP. Completing quests, clearing gates, logging daily, hitting mission milestones. Configurable values and curves.
- **Rank system:** E through S. Rank upgrades at configurable level thresholds.
- **Gym stats:** Separate panel. User-defined stats (Bench, Squat, Deadlift, etc.) with:
  - Current value
  - Trend arrow (based on recent entries)
  - History graph (line chart)
  - Manual entry
- **XP history:** Log of all XP changes with timestamps and reasons

### Notification & Reminders

- Browser Notification API for reminders (permission grant once)
- Evening reminder at configurable time if not yet logged
- Timer completion alerts
- Works when tab is open/backgrounded. Push notifications deferred to sync phase.

## Data Architecture

Designed for local-first with future sync compatibility. All reads/writes go through a thin storage abstraction layer so the backing store can be swapped from IndexedDB to Supabase without touching components.

```
Player
  ├── profile: { name, rank, level, xp, streakCount, lastLogDate }
  ├── gymStats: [{ name, unit, entries: [{ value, date }] }]
  │
  ├── gates: [{
  │     id, title, rank, status, createdAt, clearedAt,
  │     quests: [{
  │       id, title, description, priority, status, xpReward,
  │       subQuests: [{ id, title, completed }],
  │       timerDuration (optional)
  │     }]
  │   }]
  │
  ├── missions: [{
  │     id, title, rank, targetMetric, currentValue, targetValue,
  │     unit, deadline, linkedGateIds, createdAt, completedAt
  │   }]
  │
  ├── inventory: [{
  │     id, name, dateStarted, notes, tags,
  │     promotedTo (null | gateId | missionId)
  │   }]
  │
  ├── hunterRecords: [{
  │     date, entries: [{ timestamp, text }],
  │     reflection: { accomplished, blockers, mood } (optional),
  │     penaltyApplied: boolean
  │   }]
  │
  └── xpLog: [{ timestamp, amount, reason, source }]
```

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | File-based routing, RSC for static shell |
| Styling | Tailwind CSS | Rapid iteration on dark/glow aesthetic |
| Animations | Framer Motion | Level-up flashes, panel transitions, XP float-ups |
| Local DB | Dexie.js (IndexedDB) | Structured local storage, reactive queries |
| Charts | Recharts | Gym stat trend lines |
| State | Zustand | Lightweight, works with local-first |
| Future sync | Supabase | Postgres + realtime + auth when ready |
| Deployment | Vercel | Zero-config Next.js hosting |

## Design Constraints

All numeric values (XP rewards, penalties, level curves, rank thresholds) are intentionally left unconstrained in this spec. They will be configurable via a settings system and tuned during implementation and use.
