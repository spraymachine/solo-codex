alter table public.read_records
  drop constraint read_records_source_type_check;

alter table public.read_records
  add constraint read_records_source_type_check check (length(trim(source_type)) > 0);
