create table if not exists public.sticky_notes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  persona text not null check (persona in ('mani', 'harti')),
  text text not null default '',
  color text not null default '#ffe566',
  position integer not null default 0,
  pinned_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists sticky_notes_user_persona_idx
  on public.sticky_notes (user_id, persona);

alter table public.sticky_notes enable row level security;

-- Single policy: each user manages all their own notes across both personas.
-- Both personas share one account, so the partner peek reads via the same user_id.
create policy "Users manage own sticky notes"
  on public.sticky_notes
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
