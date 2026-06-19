-- Bundled fix: work_contacts schema drift. The 20260605 migration file
-- (phone2 columns) was written but never applied to the live project —
-- the app has been sending phone_label/phone2/phone2_label on every
-- contact create/update against columns that don't exist, silently
-- failing inside the fire-and-forget Supabase sync wrapper.
alter table work_contacts
  add column if not exists phone_label text not null default '',
  add column if not exists phone2      text not null default '',
  add column if not exists phone2_label text not null default '';

alter table work_contacts
  drop column if exists source,
  drop column if exists next_step;

-- Persona column. Check constraint matches the live 4-value convention
-- already used by every other persona-scoped table (sticky_notes,
-- solo_snapshots, solo_todos, ...) via the untracked allow_persona1_persona2
-- migration — not the 2-value text the older repo migration files show.
alter table work_courses add column if not exists persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_chapters add column if not exists persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_milestones add column if not exists persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_contacts add column if not exists persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));
alter table work_projects add column if not exists persona text not null default 'mani' check (persona in ('mani','harti','persona1','persona2'));

create index if not exists work_courses_user_persona_idx on work_courses (user_id, persona);
create index if not exists work_chapters_user_persona_idx on work_chapters (user_id, persona);
create index if not exists work_milestones_user_persona_idx on work_milestones (user_id, persona);
create index if not exists work_contacts_user_persona_idx on work_contacts (user_id, persona);
create index if not exists work_projects_user_persona_idx on work_projects (user_id, persona);
