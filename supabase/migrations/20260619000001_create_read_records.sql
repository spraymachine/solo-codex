create table if not exists public.read_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  persona text not null check (persona in ('mani', 'harti', 'persona1', 'persona2')),
  word text not null,
  definition text not null default '',
  part_of_speech text not null default '',
  my_definition text not null default '',
  synonyms jsonb not null default '[]'::jsonb,
  all_definitions jsonb not null default '[]'::jsonb,
  all_synonyms jsonb not null default '[]'::jsonb,
  source_type text not null check (source_type in ('book','note','newspaper','other')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists read_records_user_persona_idx on read_records (user_id, persona);

alter table public.read_records enable row level security;

create policy "Users manage own read records"
  on public.read_records
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter publication supabase_realtime add table read_records;
