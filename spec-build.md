# spec-build — DuoArc (SaaS)

Complete product specification for rebuilding from scratch.
Audience: developers, designers, or AI given this doc cold.

---

## 1. Product Concept

**DuoArc** is an accountability tracker for two people — couples, best friends, or work duos. The core insight: goals tracked alone fail; goals tracked with someone you care about get done.

Each pair shares one workspace ("space"). Each person is a **Persona** (user-defined name + accent color). Both see each other's progress in real time. Privacy controls let either person hide specific items.

This is not a general-purpose task app. It is an intentional, commitment-focused system with friction built in the right places and visibility built everywhere else.

### Value Proposition
- **Shared visibility** → you both see each other's arcs and progress
- **Daily touchpoint** → one message/quote per day, shown via the mascot
- **Soft accountability** → no harsh mechanics; presence and visibility do the work
- **Structured arcs** → user-defined time-boxed goals, not rolling to-do lists

### Core Terminology

| Concept | Name | Description |
|---|---|---|
| Timed goal | **Arc** | A goal with a start date, end date, steps, and rank |
| Step inside an arc | **Step** | Checkable sub-task; completion drives arc progress |
| Daily task | **Todo** | Date-scoped checklist item, optional privacy |
| Daily journal | **Record** | Quick log entries + reflection + gratitude; each entry public or private |
| Focus session | **Focus Timer** | Countdown overlay, persists across navigation |
| Physical tracking | **Stat** | User-defined metric with history (e.g., bench press kg) |
| XP + leveling | **Player Profile** | XP earned from actions, level/rank computed automatically |
| Daily message | **Spark** | One quote or message sent per persona per day, displayed by pug mascot |
| Two users | **Persona A / Persona B** | Named by users at setup; each has own accent color |

---

## 2. Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.4 |
| Styling | Tailwind CSS v4 | ^4 |
| Animations | Framer Motion | ^12 |
| Local DB | Dexie.js (IndexedDB) | ^4.4 |
| Charts | Recharts | ^3 |
| State | Zustand v5 | ^5 |
| Auth / Sync | Supabase JS | ^2 |
| Fonts | Geist (sans), JetBrains Mono (mono) | Google via Next.js |
| Testing | Vitest + Testing Library | ^4 / ^16 |
| Deployment | Vercel | — |

Environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 3. Onboarding & Setup Flow

First-time users land on a setup wizard (not the dashboard). Steps:

1. **Sign up** — email + password, or one-click via SSO provider (Google, Apple, Discord, GitHub)
2. **Name your Persona** — enter display name, pick accent color
3. **Invite your partner** — share invite link or code; partner signs up, joins the space
4. **Partner names their Persona** — same form; now both personas exist in one space
5. **Space is live** — both land on the shared dashboard

**Space status: `waiting_for_partner`**
After slot A completes setup, the space exists but is incomplete. Slot A lands on the dashboard but sees the waiting state throughout (see Section 9 — Waiting State). Until slot B joins, `space.status = "waiting_for_partner"` and `space.personas.B = null`.

When partner clicks invite link → completes setup → slot B claimed → `space.status` flips to `"active"` → both users get the full dashboard.

**Guide buttons:** Every major feature has a `?` helper button (top-right of section). Clicking opens a concise inline tooltip or drawer explaining what the feature does and how to use it. Never auto-shows; always opt-in. Helper copy should be written for someone who's never seen a productivity app.

---

## 4. Data Models

```typescript
type Rank = "S" | "A" | "B";
// Rank maps to difficulty tier:
// S = Difficulty 1 (hardest / highest commitment)
// A = Difficulty 2 (medium)
// B = Difficulty 3 (lighter / lower commitment)
// In UI: show rank prominently, difficulty number subtly (e.g., small label "Difficulty 1")

type ArcStatus = "active" | "cleared" | "failed" | "paused";
type PersonaSlot = "A" | "B";   // slot within space; display name is user-defined

type SpaceStatus = "waiting_for_partner" | "active";
// waiting_for_partner → slot A exists, slot B not yet claimed
// active              → both slots filled, full features unlocked

interface Space {
  id: string;
  createdAt: string;
  status: SpaceStatus;
  personas: {
    A: PersonaProfile;
    B: PersonaProfile | null;   // null until partner joins
  };
}

interface PersonaProfile {
  slot: PersonaSlot;
  userId: string;         // Supabase auth user ID
  displayName: string;    // user-chosen, e.g. "Sam"
  accentColor: string;    // hex, user-chosen at setup
}

interface Arc {
  id: string;
  spaceId: string;
  ownerSlot: PersonaSlot;       // who created it
  title: string;
  rank: Rank;                   // S / A / B
  startDate: string;            // YYYY-MM-DD, user-set
  endDate: string;              // YYYY-MM-DD, user-set
  why: string;                  // motivation / "because" field
  steps: ArcStep[];
  status: ArcStatus;
  visibleToPartner: boolean;    // true = partner can see; false = hidden
  createdAt: string;
  clearedAt: string | null;
  calendarEventId: string | null;   // external calendar event ID after sync
  calendarProvider: "google" | "apple" | "outlook" | null;
}

interface ArcStep {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
}

interface Todo {
  id: string;
  spaceId: string;
  ownerSlot: PersonaSlot;
  title: string;
  date: string;                 // YYYY-MM-DD (belongs to this day only)
  completed: boolean;
  completedAt: string | null;
  visibleToPartner: boolean;    // toggle per item
  linkedArcId: string | null;   // optional link to an Arc
  createdAt: string;
  calendarEventId: string | null;
  calendarProvider: "google" | "apple" | "outlook" | null;
}

interface JournalEntry {
  id: string;
  spaceId: string;
  ownerSlot: PersonaSlot;
  date: string;
  timestamp: string;
  text: string;
  isPublic: boolean;            // false = only owner sees it
}

type MoodRating = "great" | "good" | "okay" | "bad" | "could-do-better";
// Each maps to a distinct pug sticker expression:
// great         → pug with sunglasses / big grin
// good          → pug smiling, tongue out
// okay          → pug neutral, tilted head
// bad           → pug droopy ears, sad eyes
// could-do-better → pug hiding face in paws

interface DailyRecord {
  date: string;                 // primary key per space+persona
  spaceId: string;
  ownerSlot: PersonaSlot;
  entries: JournalEntry[];
  reflection: string | null;
  reflectionIsPublic: boolean;
  gratitude: GratitudeItem[];
  mood: MoodRating | null;      // pug mood sticker for the day; null = not set
  moodIsPublic: boolean;        // default true — partner can see your mood sticker
  penaltyApplied: boolean;
}

interface GratitudeItem {
  text: string;
  isPublic: boolean;
}

interface Spark {
  id: string;
  spaceId: string;
  fromSlot: PersonaSlot;
  toSlot: PersonaSlot;
  text: string;                 // the quote or message
  date: string;                 // YYYY-MM-DD — one per sender per day
  createdAt: string;
}

interface Stat {
  id: string;
  spaceId: string;
  ownerSlot: PersonaSlot;
  name: string;
  unit: string;
  entries: StatEntry[];
}

interface StatEntry {
  value: number;
  date: string;
}

interface PlayerProfile {
  spaceId: string;
  slot: PersonaSlot;
  level: number;
  xp: number;
  rank: Rank;                   // auto-computed from level
  streakCount: number;
  lastLogDate: string | null;
}

interface XpLogEntry {
  id: string;
  spaceId: string;
  slot: PersonaSlot;
  timestamp: string;
  amount: number;
  reason: string;
  source: string;               // "arc" | "todo" | "record" | "penalty"
}

interface InventoryItem {
  id: string;
  spaceId: string;
  ownerSlot: PersonaSlot;
  name: string;
  dateStarted: string;
  notes: string;
  tags: string[];
  promotedToArcId: string | null;
}

interface AppSnapshot {
  space: Space;
  arcs: Arc[];
  todos: Todo[];
  records: DailyRecord[];
  sparks: Spark[];
  stats: Stat[];
  inventory: InventoryItem[];
  playerProfiles: PlayerProfile[];
  xpLog: XpLogEntry[];
}
```

---

## 5. Arc System (Core Feature)

### What is an Arc
An Arc is a time-boxed goal with a user-defined start and end date. Unlike rolling to-do lists, arcs have deadlines built in. Completing steps drives arc progress. Time passing drives arc urgency.

### Arc Limits
- **Maximum 3–5 active arcs per persona at any time.**
- Attempting to create a 6th active arc blocks creation and shows a message: "You have 5 active arcs. Clear or pause one before starting a new one."
- Paused arcs don't count toward the limit.

### Arc Rank & Difficulty

| Rank | Difficulty | Meaning |
|---|---|---|
| S | 1 | Hardest. High commitment, life-changing scope |
| A | 2 | Meaningful. Significant effort required |
| B | 3 | Lighter. Habit-forming or shorter-term effort |

In the UI:
- Rank letter (S / A / B) shown prominently on the arc card
- Difficulty number shown subtly — small label, muted color, e.g. `Difficulty 1`

### Arc Card Layout

Each arc card shows:

```
┌──────────────────────────────────────────────────────┐
│  [Rank: S]  [Difficulty 1]              [⊙ active]  │
│  Arc title                                           │
│  "why" tagline (muted, smaller)                     │
│                                                      │
│  ── TIME ──────────────────────────── Due: Jun 30 ─ │
│  [████████████░░░░░░░░░░░░░░░░░░] 45% elapsed       │
│                                                      │
│  ── PROGRESS ─────────────────────── 3 / 7 steps ─  │
│  [█████████████████░░░░░░░░░░░░░] 43% complete      │
│                                                      │
│  [Steps ▾]          [👁 Hide]         [Edit]        │
└──────────────────────────────────────────────────────┘
```

**Time bar:** `elapsedDays / totalDays * 100%`. Shows due date text. Turns amber when > 70% elapsed but < 50% complete. Turns red when overdue.

**Progress bar:** `completedSteps / totalSteps * 100%`. Turns green when arc is cleared.

**Hide button (👁):** Toggles `visibleToPartner`. Immediately hides/shows from partner's view. Button shows lock icon when hidden. Tooltip: "Hidden from [partner name]".

### Arc Steps
- Checklist inside each arc
- Toggle complete → awards XP, updates progress bar
- Add/delete/reorder steps
- Completed steps collapse to bottom with strikethrough

### Arc Status Transitions
```
active → cleared  (all steps done OR manual clear)
active → failed   (manual; past due date is a nudge, not auto-fail)
active → paused   (manual; excluded from the 3–5 limit)
paused → active   (resume)
```

---

## 6. XP & Leveling

```typescript
xp: {
  stepComplete:      10,
  arcClear: {
    B: 80,
    A: 200,
    S: 400,
  },
  dailyLog:          15,
  missedDayPenalty:  -50,
},
leveling: {
  xpPerLevel: (level: number) => level * 100,
},
ranks: {
  // level thresholds for rank upgrade
  thresholds: { B: 1, A: 16, S: 51 },
},
```

**What fires XP:**
- Step completed in an arc
- Arc cleared
- First journal entry of a day (streak + XP)
- Missed-day penalty (next open after midnight, if no log)

---

## 7. Spark System (Daily Message)

**Spark** = one message or quote sent from one persona to the other, once per day.

### Rules
- Each persona can send exactly **1 spark per day** to their partner
- Once sent, cannot be edited or deleted that day
- Receiving persona sees it when they open the app

### Pug Mascot
A pug illustration is the messenger. When a spark is waiting:
- Pug sits in a bubble/card on the dashboard with the message
- Pug has idle animation (subtle bob or blink)
- If no spark today: pug shows a default idle state with small placeholder text ("Nothing from [partner] yet today")
- After spark is read/dismissed: pug moves to a smaller persistent footer presence

### Spark UI
```
┌─────────────────────────────────────┐
│  🐶  From [Partner Name]            │
│                                     │
│  "The secret of getting ahead       │
│   is getting started."              │
│                    — Mark Twain     │
│                                     │
│  [Dismiss]                          │
└─────────────────────────────────────┘
```

Compose UI: text input + "Send spark" button. After sending, button disabled for the day with "Sent today ✓" state.

---

## 8. Privacy System

Three levels of privacy across the app:

### Arc Privacy
- `visibleToPartner: boolean` on each Arc
- Toggle via 👁 button on arc card
- Hidden arcs invisible to partner in all views
- Owner sees own hidden arcs with a `[hidden]` badge

### Todo Privacy
- `visibleToPartner: boolean` on each Todo
- Toggle via 👁 icon on todo row (inline, small)
- Hidden todos not shown in partner's view of that day

### Journal Privacy
- Each `JournalEntry` has `isPublic: boolean`
- Each gratitude item has `isPublic: boolean`
- `reflection` has `reflectionIsPublic: boolean`
- Private entries shown to owner with 🔒 icon
- Public entries visible to partner in the shared journal view

**Privacy defaults:**
- Arcs: `visibleToPartner = true`
- Todos: `visibleToPartner = true`
- Journal entries: `isPublic = true` (transparency is the point)
- Reflection: `reflectionIsPublic = true`
- Gratitude: `isPublic = true`

---

## 9. Dashboard Layout (Home Page)

Single-page app. All sections scroll vertically. Max width `1220px`.

### Section Order

```
1. Persona Switcher / Space Header
2. Spark (pug mascot + daily message)
3. Quick Log
4. 01 — Arcs
5. 02 — Daily Todos
6. 03 — Reflection
7. 04 — Calendar
8. 05 — Mini Status
```

---

### 9.1 Space Header

Shows both personas side by side as cards. Clicking your own card = active (no switch needed — you are you). Shows partner card as view-only.

Displays:
- Your name + accent color indicator
- Partner's name + their accent color
- Selected date label
- Double-click your card → jump to today

**Waiting state (`space.status === "waiting_for_partner"`):**
Partner card replaced with an invite card:

```
┌─────────────────────────────────────────┐
│  Waiting for your partner               │
│                                         │
│  Share this code or link to invite them │
│                                         │
│  Code:  [ XKQJ-7T2M ]  [Copy]         │
│  Link:  [ Copy invite link ]            │
│                                         │
│  🐶 The pug is waiting too…            │
└─────────────────────────────────────────┘
```

- Invite code displayed prominently (large monospace)
- Copy button for code and for full URL
- Pug in idle waiting pose
- Refreshes automatically when partner joins (Realtime on `spaces` table)

---

### 9.2 Spark (Pug Mascot)

Persistent section near top of dashboard. See Section 7 above.

**Guide button:** "What is a Spark?" → "One message or quote you send your partner each day. They'll see it here when they open the app. The pug delivers it."

**Waiting state:** Spark compose input is disabled. Pug shows with speech bubble: _"Someone needs to show up before sparks can fly."_ Send button replaced with a ghost "Invite your partner" shortcut that scrolls to the invite card.

---

### 9.3 Quick Log

- Live clock (monospace, updates every 30s)
- Input field + "Log" button
- Adds timestamped entry to DailyRecord for selectedDate
- First entry of a new date: +15 XP, streak update
- Shows last 4 entries in reverse chrono
- Each entry has 🔒 toggle (inline) to mark private
- Private entries show in owner's view with lock icon; hidden from partner view

---

### 9.4 Section 01 — Arcs

**Header:** "Arcs" + `?` guide button + "New Arc" button

**Guide button text:** "An Arc is a goal with a deadline. Give it a start date, end date, and break it into steps. You and your partner see each other's arcs by default — accountability is the point."

**Tabs or filter:** "Mine" | "Partner's" | "Both" (default: Both)

Partner's arcs shown as read-only cards. Steps visible but not checkable by partner.

**Arc limit banner:** shown when persona has 5 active arcs. Blocks new arc creation with explanation.

**New Arc form fields:**
- Title (required)
- Why / motivation (optional, shown on card)
- Rank: S / A / B selector (shows difficulty label on hover/select)
- Start date (date picker, defaults to today)
- End date (date picker, required)
- Steps (add inline, reorderable)
- Visible to partner: toggle (default on)

**Arc card:** See Section 5 above.

**Waiting state:** Own arcs fully functional (create/edit/complete steps). Partner arc column replaced with a ghost card:

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
   Partner's arcs               
│  appear here once they join.  │
   Invite them to get started.  
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

- Dashed border, muted opacity
- "Both" tab still visible but partner column shows ghost card
- "Partner's" tab shows the same ghost card full-width

---

### 9.5 Section 02 — Daily Todos

Date-scoped task list. Belongs to selectedDate only.

- Add todo input + button (Enter or click)
- Each row: checkbox | title | 👁 privacy toggle | × delete
- Completed items: strikethrough, sorted to bottom
- Partner's todos for same date shown below own todos (only public ones)
- If partner has hidden todos, small note: "[Partner] has [N] hidden items today"

**Guide button text:** "Daily todos are just for today. They don't roll over. Link one to an Arc to tick off a step while you're at it."

Optional: link todo to an arc (step gets auto-checked when todo is completed).

**Waiting state:** Own todos fully functional. Partner todos area replaced with muted ghost row: _"[Partner name] hasn't joined yet — their todos will show here."_ No empty-count note shown until partner is active.

---

### 9.6 Section 03 — Reflection

Three sub-areas on desktop (mood top, then two columns); stacked on mobile.

**Mood Sticker (top of section, inline row):**

A horizontal row of 5 pug sticker buttons. One selectable per day.

```
How's today?

[ 😎 Great ]  [ 😊 Good ]  [ 😐 Okay ]  [ 😞 Bad ]  [ 🐾 Could do better ]
```

- Each option is a labeled pug sticker (SVG or Lottie still frame)
- Active selection gets accent border + slight scale-up
- Tapping same mood again deselects (mood → null)
- 🔒 privacy toggle on the row (hides from partner when locked)
- If partner has set a mood and it's public: shown as small avatar-tagged sticker below the selector ("Sam is feeling: Good")
- Mood persists per selected date (browsing to past date shows that day's mood)

**Mood sticker expressions:**
| Value | Pug Expression | Tone |
|---|---|---|
| `great` | Sunglasses, big grin | Celebratory |
| `good` | Smiling, tongue out | Upbeat |
| `okay` | Neutral, tilted head | Neutral |
| `bad` | Droopy ears, sad eyes | Low |
| `could-do-better` | Hiding face in paws | Reflective, not harsh |

**Left — Gratitude:**
- Add input + button
- Each item shows with 🔒 toggle
- Displayed in reverse order

**Right — Reflection:**
- Textarea with "Reflect on the day…" prompt
- Save/Edit toggle (read mode shows saved text + Edit button)
- 🔒 toggle for reflection visibility

**Waiting state (mood + reflection):** Own mood picker, gratitude, and reflection fully usable. Partner's mood sticker area beneath the picker shows: _"Your partner's mood appears here once they join."_ — muted text, no ghost sticker rendered.

---

### 9.7 Section 04 — Calendar

Grid showing the last 60 days + future 30 days (rolling window, not arc-dependent).

Each cell:
- Day number + weekday initial
- Corner chip: todos AND log = solid; log only = accent; todos only = amber
- Selected date: inset border
- Today: small underline marker
- Click → selectDate → all sections scope to that day

**Partner indicators:** Small dot in partner's accent color if partner has public activity on that day. If partner set a public mood for that day, show the matching mini pug sticker icon (16×16px) on the cell.

**Waiting state:** Calendar fully functional for own data. Partner indicators (dot + mood sticker) simply absent — no placeholder on each cell. A single banner above the grid: _"Partner activity will appear on this calendar once they join."_ Banner dismissed permanently once partner joins.

---

### 9.8 Section 05 — Mini Status

```
┌────────────────┐ ┌────────────────┐
│ Streak         │ │ Journal        │
│ 7 days         │ │ Logged today   │
└────────────────┘ └────────────────┘
┌─────────────────────────────────────┐
│ Arcs active    3 / 5               │
│ [████░░░░░░░░░░░░░░░░░░░░░]        │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Todos today    4 / 6 done          │
│ [████████████████░░░░░░░░] 67%     │
└─────────────────────────────────────┘
```

**Waiting state:** All own stats show normally. A persistent invite nudge card appended below the status grid:

```
┌─────────────────────────────────────┐
│ 👥  Waiting for your partner        │
│                                     │
│ Your stats are tracked. Once they   │
│ join, you'll see both side by side. │
│                                     │
│ [ Copy invite link ]                │
└─────────────────────────────────────┘
```

Card disappears permanently once `space.status === "active"`.

---

## 10. Authentication & Space Model

### Auth

Supabase Auth handles all identity. Multiple sign-in methods supported; users pick whichever they prefer. All methods produce the same `auth.users` row — space model and persona slot assignment are identical regardless of method.

**Supported providers:**

| Provider | Type | Why include |
|---|---|---|
| **Email + password** | Credential | Universal fallback |
| **Google** | OAuth2 | Most common; one-tap on mobile |
| **Apple** | OAuth2 | Required for iOS App Store if ever native; popular with couples |
| **Discord** | OAuth2 | High overlap with the duo/friend-group demographic |
| **GitHub** | OAuth2 | Dev-facing; low friction for technical users |

All OAuth providers configured in Supabase Dashboard → Auth → Providers. No custom OAuth server needed.

**AuthPanel UI layout:**
```
┌─────────────────────────────────────┐
│        Welcome to DuoArc            │
│                                     │
│  [ Continue with Google      ]  ← primary CTA
│  [ Continue with Apple       ]
│  [ Continue with Discord     ]
│  [ Continue with GitHub      ]
│                                     │
│  ──────────── or ────────────       │
│                                     │
│  Email ________________________     │
│  Password ______________________    │
│  [ Sign in ]   [ Create account ]   │
└─────────────────────────────────────┘
```

SSO buttons listed first (primary path). Email/password below a divider (fallback path).

**Post-SSO account linking:** If a user signs up with Google, then later tries to sign in with the same email via email/password, Supabase handles the conflict. Configure `autoconfirm = true` for OAuth emails. Do not allow duplicate accounts per email — enforce `unique` on email in auth settings.

**Session handling:**
- `AuthGate` wraps entire app: no session → sign-in screen
- Invalid / expired refresh token: clear `localStorage` silently, redirect to sign-in
- OAuth callback route: `/auth/callback` — exchanges code for session, redirects to `/` or `/setup` depending on whether space exists
- On OAuth sign-in, Supabase redirects to `NEXT_PUBLIC_SITE_URL/auth/callback`

**New env var required:**
```
NEXT_PUBLIC_SITE_URL=https://yourdomain.com   ← used as OAuth redirect base
```

### Space Model
A **Space** is the shared unit between two personas. One Supabase row.

```
User A signs up → creates Space → gets invite link/code
User B clicks invite → joins Space as Persona B → Space is active
```

- One user can only belong to one space (enforced at DB level)
- Space ID scopes all data: arcs, todos, records, sparks, stats

### Row-Level Security
Every table has `space_id` + `owner_slot`. RLS rules:
- User can read all rows in their space
- User can only write rows where `owner_slot` matches their slot
- Privacy filter enforced at app layer (not DB): private items are fetched but filtered in-store before rendering partner view

---

## 11. State Management

| Store | Persisted | Description |
|---|---|---|
| `useArcsStore` | No (Dexie) | Arcs + steps CRUD |
| `useTodosStore` | No (Dexie) | Date-scoped todos CRUD |
| `useRecordsStore` | No (Dexie) | Journal entries, reflection, gratitude, mood |
| `useSparksStore` | No (Dexie) | Daily sparks send/receive |
| `useStatsStore` | No (Dexie) | Gym/physical stats + entries |
| `useInventoryStore` | No (Dexie) | Inventory items |
| `usePlayerStore` | No (Dexie) | XP, level, rank, streak |
| `useTimerStore` | **Yes** (localStorage) | Focus timer, survives reload |
| `usePersonaStore` | **Yes** (localStorage) | Active persona slot, display prefs |
| `useSystemStore` | **Yes** (localStorage) | Theme, notifications, reminder time |
| `useDateStore` | **Yes** (localStorage) | Selected date |
| `useSpaceStore` | No (Dexie) | Space + partner metadata; exposes `isWaiting: boolean`; Realtime watches `spaces` table → auto-flips `isWaiting` false when partner joins |

All Dexie-backed stores share pattern: `loaded` flag + `load()` method + CRUD actions that write Dexie then update in-memory.

---

## 12. Cloud Sync (Supabase)

### Tables

```sql
-- Space (pair relationship)
create table spaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  invite_code text unique,
  status text not null default 'waiting_for_partner'
    check (status in ('waiting_for_partner', 'active'))
  -- status flipped to 'active' via DB trigger when second row inserted in space_members
  -- Enable Realtime on this table so slot A gets instant dashboard update
);

-- Persona membership
create table space_members (
  space_id uuid references spaces not null,
  user_id uuid references auth.users not null,
  slot text not null check (slot in ('A','B')),
  display_name text not null,
  accent_color text not null,
  joined_at timestamptz default now(),
  primary key (space_id, slot)
);

-- Full snapshot blob (load/sync)
create table solo_snapshots (
  space_id uuid references spaces not null,
  slot text not null,
  state jsonb not null,
  updated_at timestamptz default now(),
  primary key (space_id, slot)
);

-- Arcs
create table arcs (
  id text primary key,
  space_id uuid references spaces not null,
  owner_slot text not null,
  title text, rank text, start_date text, end_date text,
  why text, steps jsonb, status text,
  visible_to_partner boolean default true,
  cleared_at timestamptz, created_at timestamptz,
  calendar_event_id text,                          -- external event ID post-sync
  calendar_provider text                            -- google | apple | outlook
);

-- Todos
create table todos (
  id text primary key,
  space_id uuid references spaces not null,
  owner_slot text not null,
  title text, date text, completed boolean default false,
  completed_at timestamptz, visible_to_partner boolean default true,
  linked_arc_id text, created_at timestamptz
);

-- Journal entries
create table journal_entries (
  id text primary key,
  space_id uuid references spaces not null,
  owner_slot text not null,
  date text, timestamp text, text text,
  is_public boolean default true
);

-- Daily record metadata
create table daily_records (
  space_id uuid references spaces not null,
  owner_slot text not null,
  date text not null,
  reflection text,
  reflection_is_public boolean default true,
  gratitude jsonb default '[]',
  mood text check (mood in ('great','good','okay','bad','could-do-better')),
  mood_is_public boolean default true,
  penalty_applied boolean default false,
  primary key (space_id, owner_slot, date)
);

-- Sparks (daily messages)
create table sparks (
  id text primary key,
  space_id uuid references spaces not null,
  from_slot text not null,
  to_slot text not null,
  text text not null,
  date text not null,           -- one per from_slot per day
  created_at timestamptz default now(),
  unique (space_id, from_slot, date)
);

-- Stats
create table stats (
  id text primary key,
  space_id uuid references spaces not null,
  owner_slot text not null,
  name text, unit text,
  entries jsonb default '[]'
);

-- Calendar integration tokens (one row per persona per provider)
create table calendar_connections (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references spaces not null,
  slot text not null,
  provider text not null check (provider in ('google', 'apple', 'outlook')),
  access_token text,                -- encrypted at rest
  refresh_token text,               -- encrypted at rest
  token_expiry timestamptz,
  calendar_id text,                 -- target calendar ID on provider
  sync_arcs boolean default true,
  sync_todos boolean default true,
  last_synced_at timestamptz,
  unique (space_id, slot, provider)
);
```

### Sync Strategy
- On mount: fetch own snapshot, import to IndexedDB, reload stores
- On state change: debounce 700ms → push to Supabase
- Realtime: subscribe to partner's snapshot row → reload when partner saves
- Offline queue: mark pending in localStorage, flush on `online` event

---

## 13. Focus Timer

Global overlay. Persists across navigation via Zustand persist.

**Inactive:** Floating "TIMER" pill button, bottom-right corner.

**Active:** Fixed bottom bar — session name, countdown (MM:SS monospace), "Give Up" + "Done" buttons.

**Quick-start modal:**
- Session name (default "Focus Session")
- Duration in minutes (default 25)
- Optional: link to an arc step

**On complete:** If linked to arc step → marks step completed + awards step XP. Shows "Session complete" flash.

---

## 14. Penalty System

Runs once on app open via `SystemEffects`.

**Logic:**
1. Load `lastLogDate` from PlayerProfile
2. If `lastLogDate !== yesterday` AND yesterday has no journal entries AND penalty not already applied for yesterday:
   - Mark `penaltyApplied = true` on yesterday's DailyRecord
   - Reset `streakCount = 0`
   - Deduct 50 XP
3. Show `PenaltyBanner` (red warning, dismissible) until dismissed

---

## 15. Theme System

- Light / dark toggle stored in SystemStore
- `ThemeSync` component: sets `document.documentElement.dataset.theme`
- Persona accent: `document.documentElement.dataset.accentColor = accentColor` (CSS var override)
- CSS tokens: all colors as custom properties (same token pattern as previous system)

Each persona's accent color is user-chosen at setup, not limited to a preset palette (full color picker or curated set of ~12 swatches).

---

## 16. Guide System

Every major section has a `?` button (top-right of section header). Clicking shows:
- Section purpose (1 sentence)
- How to use it (2–4 steps max)
- What your partner sees

Implementation: simple inline `Tooltip` or `Drawer` component. Content stored as constants in a `guide-content.ts` file. No external library needed.

Guide content keys:
```typescript
type GuideKey =
  | "arcs"
  | "arc-card"
  | "arc-steps"
  | "arc-privacy"
  | "todos"
  | "todo-privacy"
  | "quick-log"
  | "reflection"
  | "gratitude"
  | "spark"
  | "focus-timer"
  | "penalty"
  | "mood"
  | "stats"
  | "inventory"
  | "calendar"
  | "calendar-integration"
  | "calendar-export"
  | "calendar-sync";
```

---

## 17. Inventory (Ideas Backlog)

Low-friction list for "things I want to start eventually."

Each item: name, date added, notes, tags, `promotedToArcId`.

**Promote to Arc:** one-click converts item → opens New Arc form pre-filled with item name. Item retains `promotedToArcId` as a trace.

Items are personal (scoped to owner's slot). Not shared with partner.

---

## 18. Design System

Same token architecture as the codebase it is based on, generalized:

```css
:root {
  /* Backgrounds */
  --bg-primary, --bg-secondary, --bg-panel, --bg-panel-strong

  /* Surfaces */
  --surface-border, --surface-highlight, --surface-soft

  /* Text */
  --text-primary, --text-secondary

  /* Accent (overridden per-persona via data-accent-color) */
  --accent-solid, --accent-soft

  /* Semantic */
  --danger, --success, --warning
}
```

**Persona accent override pattern:**
```css
[data-accent-color="<hex>"] {
  --accent-solid: <hex>;
  --accent-soft: color-mix(in srgb, <hex> 60%, white);
}
```

Since accent is user-chosen, inject as inline CSS variable on the `<html>` element rather than pre-defined class.

**Panel nesting:**
```
outer: rounded-[1.5rem] border(surface-border) bg(bg-secondary) p-2
  inner: rounded-[1.1rem] border(surface-highlight) bg(bg-panel-strong) px-4 py-5
```

**Rank colors:**
- S = amber/gold `#7a4a00`
- A = blue `#1f6c9f`
- B = green `#346538`

**Pug mascot:** SVG or Lottie animation. Two states: idle (sitting, slow blink) and active (ears up when spark is waiting). Kept simple — not a complex animation system.

---

## 19. Component Inventory

### Auth
- `AuthGate` — session provider + redirect
- `AuthPanel` — sign-in / sign-up form; SSO buttons (Google, Apple, Discord, GitHub) + email/password fallback
- `OAuthButton` — reusable provider button (icon + label + loading state)
- `InviteAccept` — join space via invite code

### Onboarding
- `SetupWizard` — multi-step: name persona, pick color, invite partner
- `WaitingForPartner` — full-screen holding state for partner's first load (before slot B joins)
- `PartnerWaitingCard` — inline ghost card shown in Arcs / Todos sections while partner not joined
- `InviteNudgeCard` — compact card with invite code + copy link; shown in Space Header + Mini Status waiting states
- `InviteCopyButton` — one-click copy of invite URL with "Copied!" feedback

### Layout
- `SiteHeader` — top bar (space name, theme toggle, sign out)
- `AnchorRedirect` — client-side hash redirect

### Dashboard
- `SpaceHeader` — two persona cards side by side
- `SparkCard` — pug mascot + spark display + compose
- `MiniStatus` — streak, journal status, arc count, todo progress

### Arcs
- `ArcList` — filtered list of arcs (mine / partner / both)
- `ArcCard` — card with 2 progress bars, steps toggle, hide button
- `ArcForm` — new/edit arc modal
- `ArcStepList` — steps checklist inside arc
- `ArcLimitBanner` — shown when at max active arcs

### Todos
- `TodoList` — date-scoped list (own + partner public)
- `TodoItem` — row with checkbox, privacy toggle, delete

### Records
- `QuickLogInput` — timestamped entry input
- `QuickLogFeed` — last 4 entries with privacy badges
- `MoodPicker` — 5-option pug sticker row (great/good/okay/bad/could-do-better) with privacy toggle; shows partner's mood if public
- `MoodSticker` — single read-only pug sticker display (used for partner's mood chip)
- `ReflectionEditor` — write/read mode with privacy toggle
- `GratitudeList` — add + display with privacy toggles

### Sparks
- `PugMascot` — SVG/Lottie pug with idle/active states
- `SparkCompose` — send spark input
- `SparkDisplay` — incoming spark bubble

### Calendar
- `CalendarGrid` — rolling 90-day grid (60 past + 30 future)

### Status
- `PlayerCard` — XP bar, level, rank
- `XpHistoryPanel` — XP log list
- `StatCard` — individual stat with Recharts line chart
- `StatForm` — add stat entry

### System (all render null)
- `StoreInitializer`
- `CloudSync`
- `SystemEffects`
- `ThemeSync`
- `PersonaAccentSync`

### UI Primitives
- `Button` (default / ghost / danger variants)
- `Modal`
- `Panel`
- `PenaltyBanner`
- `RankBadge` (S/A/B with difficulty subtitle)
- `XpBar`
- `ProgressBar` (reusable, color prop)
- `PrivacyToggle` (👁 / 🔒 icon button)
- `GuideButton` (`?` with tooltip/drawer)
- `Tooltip`
- `Drawer`

---

## 20. Implemented vs Planned at Launch

### Launch-Critical (V1)
- Auth + invite + space setup
- Arcs CRUD + steps + 2 progress bars + privacy toggle
- Daily todos + privacy toggle
- Quick log + reflection + gratitude (public/private)
- Spark system (send/receive 1/day) + pug mascot
- Calendar grid
- Focus Timer
- Penalty system
- XP + leveling
- Cloud sync (Supabase)
- Theme toggle
- Guide buttons on all major sections
- Partner read-only views (arcs, public todos, public journal)

### V2 (Post-Launch)
- Stat tracking (gym/physical metrics) with Recharts charts
- Inventory (ideas backlog → promote to Arc)
- XP history panel
- Arc-linked todos (auto-check step on todo complete)
- Push notifications (Supabase realtime → browser push)
- Arc templates (pre-built step lists for common goal types)
- Streak milestones + celebration animations
- Arc comments (partner can leave a note on your arc)
- **Calendar integration** (see Section 23)

---

## 21. Rebuild File Structure

```
src/
├── app/
│   ├── layout.tsx               ← root layout + system components
│   ├── globals.css              ← CSS tokens + base styles
│   ├── page.tsx                 ← full dashboard (all sections)
│   ├── auth/
│   │   └── callback/route.ts    ← OAuth callback: exchange code → session → redirect
│   ├── invite/[code]/page.tsx   ← accept invite + join space
│   └── setup/page.tsx           ← onboarding wizard
├── components/
│   ├── auth/
│   │   ├── auth-gate.tsx
│   │   └── auth-panel.tsx
│   ├── onboarding/
│   │   ├── setup-wizard.tsx
│   │   ├── waiting-for-partner.tsx   ← full-screen pre-partner holding page
│   │   ├── partner-waiting-card.tsx  ← inline ghost card for arcs/todos sections
│   │   ├── invite-nudge-card.tsx     ← compact invite card (header + status)
│   │   └── invite-copy-button.tsx    ← copy invite URL with feedback
│   ├── layout/
│   │   ├── site-header.tsx
│   │   └── anchor-redirect.tsx
│   ├── arcs/
│   │   ├── arc-list.tsx
│   │   ├── arc-card.tsx
│   │   ├── arc-form.tsx
│   │   ├── arc-step-list.tsx
│   │   └── arc-limit-banner.tsx
│   ├── todos/
│   │   ├── todo-list.tsx
│   │   └── todo-item.tsx
│   ├── records/
│   │   ├── quick-log-input.tsx
│   │   ├── quick-log-feed.tsx
│   │   ├── mood-picker.tsx          ← 5-sticker selector row + privacy toggle
│   │   ├── mood-sticker.tsx         ← single pug sticker (read-only display)
│   │   ├── reflection-editor.tsx
│   │   └── gratitude-list.tsx
│   ├── sparks/
│   │   ├── pug-mascot.tsx
│   │   ├── spark-compose.tsx
│   │   └── spark-display.tsx
│   ├── pug/
│   │   ├── pug-great.svg            ← sunglasses + big grin
│   │   ├── pug-good.svg             ← smiling, tongue out
│   │   ├── pug-okay.svg             ← neutral, tilted head
│   │   ├── pug-bad.svg              ← droopy ears, sad eyes
│   │   └── pug-could-do-better.svg  ← hiding face in paws
│   ├── calendar/
│   │   ├── calendar-grid.tsx
│   │   └── calendar-export-button.tsx  ← ICS download + provider connect
│   ├── status/
│   │   ├── player-card.tsx
│   │   ├── stat-card.tsx
│   │   ├── stat-form.tsx
│   │   └── xp-history-panel.tsx
│   ├── system/
│   │   ├── store-initializer.tsx
│   │   ├── cloud-sync.tsx
│   │   ├── focus-timer-overlay.tsx
│   │   ├── system-effects.tsx
│   │   ├── theme-sync.tsx
│   │   └── persona-accent-sync.tsx
│   └── ui/
│       ├── button.tsx
│       ├── modal.tsx
│       ├── panel.tsx
│       ├── penalty-banner.tsx
│       ├── rank-badge.tsx
│       ├── xp-bar.tsx
│       ├── progress-bar.tsx
│       ├── privacy-toggle.tsx
│       ├── guide-button.tsx
│       ├── tooltip.tsx
│       └── drawer.tsx
├── lib/
│   ├── types.ts
│   ├── config.ts
│   ├── utils.ts
│   ├── guide-content.ts         ← all guide button copy
│   ├── calendar/
│   │   ├── ics.ts               ← ICS file generator (arcs + todos → .ics)
│   │   ├── google.ts            ← Google Calendar OAuth + API client
│   │   └── caldav.ts            ← CalDAV client (Apple Calendar, Outlook)
│   ├── db/
│   │   ├── database.ts          ← Dexie schema
│   │   └── storage.ts           ← storage abstraction
│   ├── stores/
│   │   ├── arcs-store.ts
│   │   ├── todos-store.ts
│   │   ├── records-store.ts
│   │   ├── sparks-store.ts
│   │   ├── stats-store.ts
│   │   ├── inventory-store.ts
│   │   ├── player-store.ts
│   │   ├── space-store.ts
│   │   ├── timer-store.ts       ← zustand/persist
│   │   ├── persona-store.ts     ← zustand/persist
│   │   ├── system-store.ts      ← zustand/persist
│   │   └── date-store.ts        ← zustand/persist
│   └── supabase/
│       ├── client.ts
│       ├── config.ts
│       └── auth-storage.ts
```

---

## 22. Rebuild Priority Order

1. Data layer → `types.ts`, `config.ts`, `utils.ts`, `database.ts`, `storage.ts`
2. Stores → all 12 Zustand stores
3. Auth + Space setup → `auth-gate`, `auth-panel`, `setup-wizard`, invite flow
4. Root layout → system components wired in
5. Arc system → `arc-card` (with dual progress bars), `arc-form`, `arc-step-list`
6. Dashboard home page → all 8 sections
7. Spark + Pug mascot → high visible value, ships with V1
8. Privacy toggles → throughout todos, journal, arcs
9. Guide buttons → `guide-content.ts` + `GuideButton` wired everywhere
10. Focus Timer → global overlay
11. System effects → penalty check
12. Cloud sync → Supabase tables + `cloud-sync.tsx`
13. Design polish → tokens, dark mode, persona accent injection
14. V2 features → stats, inventory, push notifications, arc templates
15. V3 → calendar integration (Section 23)

---

## 23. Calendar Integration (V3 — Future)

### Goals
- Push arc deadlines + todos into the user's real calendar (Google, Apple, Outlook)
- Keep DuoArc as source of truth; calendar events are derived, not authoritative
- Both personas connect their own calendar independently — no shared calendar required
- Privacy respected: hidden arcs/todos are never pushed to calendar

---

### Integration Modes

**Mode 1 — ICS Export (ship first, no OAuth required)**
Generate a downloadable `.ics` file or a subscribe URL. User adds it to any calendar app manually or via subscription.

**Mode 2 — Direct push (V3 proper)**
OAuth flow per provider → write events directly to user's chosen calendar.

---

### What Gets Synced

| DuoArc item | Calendar event type | Details |
|---|---|---|
| Arc | Multi-day event | `start_date` → `end_date`, title = arc title, description = `why` + rank + steps list |
| Arc step (optional) | Single-day reminder | Date = estimated day (user-set or omitted) |
| Todo | Single-day event / task | `date` field, title = todo title |
| Focus session | None (session-only, no future date) | Not synced |
| Journal entry | None (private by default) | Not synced |

**Never synced:**
- Items where `visibleToPartner = false` (hidden arcs/todos)
- Private journal entries
- Partner's data — each persona syncs only their own items

---

### ICS File Structure (`src/lib/calendar/ics.ts`)

```typescript
interface IcsEvent {
  uid: string;              // arc.id or todo.id (stable, enables update on re-export)
  summary: string;          // arc title or todo title
  description?: string;     // arc: why + rank + step list
  dtstart: string;          // YYYYMMDD for all-day or YYYYMMDDTHHmmssZ for timed
  dtend: string;
  dtstamp: string;          // generation timestamp
  status: "CONFIRMED" | "CANCELLED";
  categories?: string[];    // ["DUOARC", "ARC-S"] or ["DUOARC", "TODO"]
  url?: string;             // deep link back to DuoArc (future)
}

function generateIcs(events: IcsEvent[]): string { /* returns .ics text */ }

function arcToIcsEvent(arc: Arc): IcsEvent { /* maps Arc → IcsEvent */ }
function todoToIcsEvent(todo: Todo): IcsEvent { /* maps Todo → IcsEvent */ }
```

Generated ICS file is served from an API route or downloaded client-side.

---

### Subscribe URL (ICS feed)

```
GET /api/calendar/feed?token=<personal_feed_token>&slot=A
```

- `personal_feed_token`: per-persona opaque token, stored in `calendar_connections` table
- Returns `text/calendar` with all public arcs + todos for that persona
- Token is revocable (generate new token invalidates old)
- User pastes URL into Google Calendar / Apple Calendar "Add by URL"
- Updates automatically when user's arcs/todos change (calendar app polls)

Supabase edge function or Next.js route handler handles this endpoint.

---

### Google Calendar — Direct Push (`src/lib/calendar/google.ts`)

**OAuth Flow:**
1. User clicks "Connect Google Calendar" in settings
2. Redirect to Google OAuth consent screen (scopes: `https://www.googleapis.com/auth/calendar.events`)
3. Callback → exchange code for `access_token` + `refresh_token`
4. Store tokens encrypted in `calendar_connections` table
5. User selects which Google calendar to push to (list fetched via API)

**Sync logic:**
```typescript
// On arc create/update:
async function pushArcToGoogle(arc: Arc, connection: CalendarConnection) {
  const event = arcToGoogleEvent(arc);
  if (arc.calendarEventId) {
    await googleApi.events.update(connection.calendarId, arc.calendarEventId, event);
  } else {
    const created = await googleApi.events.insert(connection.calendarId, event);
    await storage.updateArc(arc.id, { calendarEventId: created.id, calendarProvider: "google" });
  }
}

// On arc delete / status → failed:
async function deleteArcFromGoogle(arc: Arc, connection: CalendarConnection) {
  if (arc.calendarEventId) {
    await googleApi.events.delete(connection.calendarId, arc.calendarEventId);
  }
}
```

**Token refresh:** check `token_expiry` before each API call; refresh via `https://oauth2.googleapis.com/token` if expired; update stored tokens.

---

### Apple Calendar / Outlook — CalDAV (`src/lib/calendar/caldav.ts`)

Both Apple Calendar and Outlook support CalDAV. Push events using the `tsdav` library (or raw HTTP `PUT` requests).

```typescript
// PUT event to CalDAV server
async function pushEventCalDAV(
  serverUrl: string,
  credentials: { username: string; password: string },  // app-specific password for Apple
  calendarPath: string,
  uid: string,
  icsText: string,
) { /* HTTP PUT /<calendarPath>/<uid>.ics */ }
```

Apple Calendar requires an **app-specific password** (not main Apple ID password). Outlook uses OAuth2 with MS Graph API (similar pattern to Google).

---

### Sync Triggers

| Trigger | Action |
|---|---|
| Arc created | Push event to connected calendar |
| Arc title/dates/why updated | Update existing calendar event |
| Arc cleared or failed | Delete or cancel event |
| Todo created (with date) | Push task/event |
| Todo completed | Mark event done (Google Tasks) or delete |
| Todo deleted | Delete calendar event |
| User connects calendar | Full initial sync: push all active arcs + future todos |
| User disconnects calendar | Delete all DuoArc events from that calendar |

Sync runs after the Supabase cloud sync (700ms debounce), not before. Calendar is always derived from DuoArc state.

---

### Settings UI — Calendar Section

Located in user settings panel. One section per persona (partner's calendar is theirs to connect).

```
── Calendar Integration ──────────────────────────────────

  📅 Sync your arcs and todos to your calendar.
     Your partner connects their own separately.

  [ Connect Google Calendar ]
  [ Subscribe via URL (any calendar app) ]
  [ Connect Apple Calendar ]

  ── Connected ────────────────────────────
  ✓ Google Calendar — "Personal" [Change] [Disconnect]

  Sync settings:
  ☑ Arcs (deadlines as multi-day events)
  ☑ Todos (daily tasks)

  Feed URL: https://duoarc.app/api/calendar/feed?token=xxx
  [Copy URL]  [Regenerate]
```

---

### Data Model Additions (recap)

**`Arc`:** add `calendarEventId: string | null`, `calendarProvider: "google" | "apple" | "outlook" | null`

**`Todo`:** add `calendarEventId: string | null`, `calendarProvider: "google" | "apple" | "outlook" | null`

**`CalendarConnection`** (new, Supabase only — not in IndexedDB):
```typescript
interface CalendarConnection {
  id: string;
  spaceId: string;
  slot: PersonaSlot;
  provider: "google" | "apple" | "outlook";
  accessToken: string;        // stored encrypted in Supabase
  refreshToken: string;
  tokenExpiry: string;
  calendarId: string;         // target calendar on provider
  syncArcs: boolean;
  syncTodos: boolean;
  lastSyncedAt: string | null;
}
```

Tokens are never stored in IndexedDB or localStorage. Always fetched from Supabase server-side (via edge function or server action) to avoid exposing tokens to the browser.

---

### Security Notes

> **Warning:** OAuth tokens must be encrypted at rest in Supabase. Use Postgres `pgcrypto` extension or store via a server-side edge function that never exposes raw tokens to the client. The browser should only ever receive a "connected: true" signal, not the tokens themselves. All calendar API calls must go through a server-side route handler or Supabase edge function.

---

### New Routes / API Handlers

```
src/app/
├── api/
│   ├── calendar/
│   │   ├── feed/route.ts           ← GET: serve ICS feed by token
│   │   ├── google/
│   │   │   ├── auth/route.ts       ← GET: redirect to Google OAuth
│   │   │   └── callback/route.ts   ← GET: exchange code, store tokens
│   │   ├── apple/
│   │   │   └── connect/route.ts    ← POST: save CalDAV credentials
│   │   └── sync/route.ts           ← POST: trigger manual sync for persona
│   └── webhooks/
│       └── calendar/route.ts       ← POST: receive Google push notifications (future)
```

---

### Phased Delivery

| Phase | Scope | Effort |
|---|---|---|
| **23a** | ICS export (download) + subscribe URL feed | Low — no OAuth |
| **23b** | Google Calendar OAuth + direct push/update/delete | Medium |
| **23c** | Apple Calendar via CalDAV + app-specific password | Medium |
| **23d** | Outlook via MS Graph OAuth | Medium (same pattern as Google) |
| **23e** | Google push notifications (webhook) for two-way awareness | High |

Ship 23a first. It covers 80% of user needs with minimal complexity. 23b–23d add provider-specific OAuth but use the same underlying event model.
