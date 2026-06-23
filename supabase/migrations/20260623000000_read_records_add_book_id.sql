alter table public.read_records
  add column if not exists book_id uuid;
