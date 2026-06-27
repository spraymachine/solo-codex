alter table public.read_records
  add column if not exists favorite boolean not null default false;
