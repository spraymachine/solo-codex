alter table work_contacts
  add column if not exists phone_label text not null default '',
  add column if not exists phone2      text not null default '',
  add column if not exists phone2_label text not null default '';

alter table work_contacts
  drop column if exists source,
  drop column if exists next_step;
