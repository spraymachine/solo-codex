# Arc Edit Feature Handover

## Overview
Added full arc editing capability to the dashboard. Users can now modify arc properties (name, dates, rank, difficulty) via an Edit button on each arc card. Legend showing rank and difficulty is displayed as inline badges below the arc title.

## Changes Made

### Type System
- **src/lib/types.ts**: Added `difficulty: 1 | 2 | 3` field to Gate interface
  - 1 = Easy
  - 2 = Medium  
  - 3 = Hard (most difficult)

### Storage Layer
- **src/lib/db/storage.ts**: Updated `createGate()` signature to accept `difficulty?: 1 | 2 | 3`
  - Defaults to 1 if not provided
  - Passed through to database

### State Management
- **src/lib/stores/gates-store.ts**: Updated `createGate` type signature to include difficulty in options
- **src/components/system/cloud-sync.tsx**: 
  - Added `difficulty` field to `GoalRow` type
  - Updated `fromGoalRow()` to map difficulty from row data (defaults to 1)

### UI Components
- **src/app/page.tsx**: 

#### CreateArcModal
- Updated to accept difficulty parameter
- Ranks reduced to S, A, E only (was S, A, B, C, D, E)
- Added difficulty selector (buttons for 1, 2, 3)
- Difficulty passed to `createGate()`

#### EditArcModal (NEW)
- Mirror of CreateArcModal but for editing
- Takes current arc as prop
- Updates `title`, `rank`, `difficulty`, `date`, `endDate`
- Calls `updateGate()` to persist changes

#### Arc Card Layout
- Grid changed from 3 columns to 2 columns (removed separate legend card)
- Legend moved inline below arc title as compact badges:
  - Priority badge: colored dot + "S Rank" / "A Rank" / "E Rank"
  - Difficulty badge: "Difficulty 1" / "Difficulty 2" / "Difficulty 3"
- Both badges styled as small pills with `bg-[var(--bg-panel)]`
- Edit button added next to Delete button
- Clicking Edit button opens EditArcModal with current arc data

#### ArcLegend Component
- Kept in codebase but no longer used (was for separate legend card)
- Can be removed in future cleanup if not needed elsewhere

### State
- Added `editingArcId` state to track which arc is being edited
- `setEditingArcId` called on Edit button click
- EditArcModal reads from `arcGoals.find(goal => goal.id === editingArcId)`

## UI Details

### Legend Badge Styling
```jsx
<span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-panel)] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: rankColor }} />
  {goal.rank} Rank
</span>
```

### Rank Colors
- S: #e8c840 (gold)
- A: #5ea2ff (blue)
- E: #a89080 (gray)
- B: #61c78c (green)
- C: #c8a000 (dark gold)
- D: #e05c5a (red)

## How It Works

### Creating Arc with Difficulty
1. Click "New arc" button
2. CreateArcModal opens
3. Select priority rank (S, A, E buttons)
4. Select difficulty (1, 2, 3 buttons)
5. Set dates and name
6. Submit - difficulty saved to database

### Editing Arc
1. Click "Edit" button on arc card
2. EditArcModal opens with current values
3. Modify name, rank, difficulty, dates
4. Click "Update arc"
5. Changes persist via `updateGate()`

## Testing Checklist
- [ ] Create arc with difficulty level
- [ ] Arc card displays rank and difficulty badges
- [ ] Click Edit button opens modal with current values
- [ ] Edit arc properties and verify changes persist
- [ ] Try all rank/difficulty combinations
- [ ] Mobile layout responsive with inline badges
- [ ] Legend badges don't wrap unnecessarily
- [ ] Colors match expected rank palette

## Future Considerations

### Migration
If there are existing arcs without difficulty:
- `fromGoalRow()` defaults to difficulty 1
- No database migration needed if `difficulty` column is nullable with default

### Cleanup
- Remove `ArcLegend()` function if not used elsewhere
- Consider extracting legend badge into reusable component if needed on other pages

### Enhancement Ideas
- Difficulty indicator in progress bars (color coded by difficulty)
- Filter arcs by difficulty
- Sort by difficulty in addition to rank
- Difficulty-based weighting in metrics/streaks
- Visual distinction (icon, border) based on difficulty level

## File Changes Summary
- `src/lib/types.ts` - Added difficulty to Gate
- `src/lib/db/storage.ts` - Updated createGate signature
- `src/lib/stores/gates-store.ts` - Updated type signature
- `src/components/system/cloud-sync.tsx` - Added difficulty to GoalRow and fromGoalRow
- `src/app/page.tsx` - Major changes:
  - Updated CreateArcModal to include difficulty
  - Added EditArcModal component
  - Updated arc card rendering with inline legend
  - Added editingArcId state
  - Grid changed from 3 to 2 columns

## Rollback Plan
All changes are additive/non-breaking:
1. Existing arcs without difficulty get default value of 1
2. Can hide difficulty UI by removing difficulty fields from modals
3. Can remove EditArcModal and put Edit button back to just opening modal
4. No database migration required if difficulty column exists
