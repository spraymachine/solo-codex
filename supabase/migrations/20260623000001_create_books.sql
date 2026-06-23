create table if not exists public.books (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  persona text not null check (persona in ('mani', 'harti', 'persona1', 'persona2')),
  google_volume_id text,
  title text not null,
  authors jsonb not null default '[]'::jsonb,
  cover_url text,
  total_pages integer,
  shelf text not null check (shelf in ('want','reading','read')),
  current_page integer not null default 0,
  rating integer check (rating between 1 and 5),
  notes text not null default '',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists books_user_persona_idx on books (user_id, persona);

alter table public.books enable row level security;

create policy "Users manage own books"
  on public.books
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter publication supabase_realtime add table books;
