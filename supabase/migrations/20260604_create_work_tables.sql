-- Work Courses
create table if not exists work_courses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null default '',
  goal text not null default '',
  deadline text not null default '',
  source text not null default '',
  status text not null default 'planned' check (status in ('planned', 'active', 'paused', 'completed')),
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null,
  unique(user_id, id)
);

-- Work Chapters
create table if not exists work_chapters (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references work_courses(id) on delete cascade,
  title text not null,
  deadline text not null default '',
  estimate text not null default '',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  "order" integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(user_id, id)
);

-- Work Milestones
create table if not exists work_milestones (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id text not null references work_chapters(id) on delete cascade,
  title text not null,
  deadline text not null default '',
  estimate text not null default '',
  link text not null default '',
  notes text not null default '',
  completed boolean not null default false,
  "order" integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(user_id, id)
);

-- Work Contacts
create table if not exists work_contacts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'lead' check (status in ('lead', 'prospect', 'client', 'lost', 'archived')),
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  source text not null default '',
  next_step text not null default '',
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null,
  unique(user_id, id)
);

-- Work Projects
create table if not exists work_projects (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id text not null references work_contacts(id) on delete cascade,
  title text not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'paused', 'completed', 'archived')),
  deadline text not null default '',
  notes text not null default '',
  progress integer not null default 0,
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null,
  unique(user_id, id)
);

-- RLS Policies
alter table work_courses enable row level security;
alter table work_chapters enable row level security;
alter table work_milestones enable row level security;
alter table work_contacts enable row level security;
alter table work_projects enable row level security;

create policy "Users can manage their own courses"
  on work_courses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own chapters"
  on work_chapters
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own milestones"
  on work_milestones
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own contacts"
  on work_contacts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own projects"
  on work_projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Realtime subscriptions
alter publication supabase_realtime add table work_courses;
alter publication supabase_realtime add table work_chapters;
alter publication supabase_realtime add table work_milestones;
alter publication supabase_realtime add table work_contacts;
alter publication supabase_realtime add table work_projects;
