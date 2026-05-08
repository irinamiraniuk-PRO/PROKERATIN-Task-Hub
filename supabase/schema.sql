create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('director', 'employee', 'guest');
  end if;
end $$;

create table if not exists public.profiles (
  id text primary key,
  name text not null,
  login text not null unique,
  role public.app_role not null default 'employee',
  avatar text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  description text not null,
  created_by text not null references public.profiles(id) on delete restrict,
  assigned_to text not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null,
  deadline timestamptz not null,
  planned_date date,
  priority text not null,
  status text not null,
  tags jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  transferred_to text,
  transferred_from text,
  sent_to_director_at timestamptz,
  recurrence text,
  recurrence_custom_days integer,
  parent_recurring_id text,
  reaction_deadline timestamptz,
  project_id text,
  depends_on jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.comments (
  id text primary key,
  task_id text not null references public.tasks(id) on delete restrict,
  author_id text not null references public.profiles(id) on delete restrict,
  text text not null,
  mentions jsonb,
  created_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.task_history (
  id text primary key,
  task_id text not null references public.tasks(id) on delete restrict,
  -- intentionally no FK for actor_id: history may contain system/automation actors
  -- and historical IDs of users that were later archived; this keeps history append-only.
  -- joins on actor_id must handle missing/archived profiles explicitly.
  actor_id text not null,
  action text not null,
  from_status text,
  to_status text,
  meta text,
  created_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.notes (
  id text primary key,
  user_id text not null references public.profiles(id) on delete restrict,
  title text not null,
  content text not null,
  emoji text not null,
  color text not null,
  pinned boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.user_settings (
  user_id text primary key references public.profiles(id) on delete restrict,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()::text
    and deleted_at is null
  limit 1
$$;

create or replace function public.is_director()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_profile_role() = 'director', false)
$$;

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.task_history enable row level security;
alter table public.notes enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
for select
using (
  deleted_at is null
  and (
    auth.role() = 'anon'
    or public.is_director()
    or id = auth.uid()::text
  )
);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
for insert
with check (
  id = auth.uid()::text
  or public.is_director()
);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
for update
using (
  public.is_director()
  or id = auth.uid()::text
)
with check (
  public.is_director()
  or id = auth.uid()::text
);

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
for select
using (
  deleted_at is null
  and (
    public.is_director()
    or created_by = auth.uid()::text
    or assigned_to = auth.uid()::text
  )
);

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
for insert
with check (
  public.current_profile_role() in ('director', 'employee')
  and created_by = auth.uid()::text
);

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
for update
using (
  public.is_director()
  or created_by = auth.uid()::text
  or assigned_to = auth.uid()::text
)
with check (
  public.is_director()
  or created_by = auth.uid()::text
  or assigned_to = auth.uid()::text
);

drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
for select
using (
  deleted_at is null
  and exists (
    select 1
    from public.tasks t
    where t.id = comments.task_id
      and t.deleted_at is null
      and (
        public.is_director()
        or t.created_by = auth.uid()::text
        or t.assigned_to = auth.uid()::text
      )
  )
);

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
for insert
with check (
  author_id = auth.uid()::text
  and exists (
    select 1
    from public.tasks t
    where t.id = comments.task_id
      and t.deleted_at is null
      and (
        public.is_director()
        or t.created_by = auth.uid()::text
        or t.assigned_to = auth.uid()::text
      )
  )
);

drop policy if exists "comments_update" on public.comments;
create policy "comments_update" on public.comments
for update
using (
  public.is_director()
  or author_id = auth.uid()::text
)
with check (
  public.is_director()
  or author_id = auth.uid()::text
);

drop policy if exists "history_select" on public.task_history;
create policy "history_select" on public.task_history
for select
using (
  deleted_at is null
  and exists (
    select 1
    from public.tasks t
    where t.id = task_history.task_id
      and t.deleted_at is null
      and (
        public.is_director()
        or t.created_by = auth.uid()::text
        or t.assigned_to = auth.uid()::text
      )
  )
);

drop policy if exists "history_write" on public.task_history;
create policy "history_write" on public.task_history
for all
using (
  public.is_director()
  or actor_id = auth.uid()::text
)
with check (
  public.is_director()
  or actor_id = auth.uid()::text
);

drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
for select
using (
  deleted_at is null
  and (
    public.is_director()
    or user_id = auth.uid()::text
  )
);

drop policy if exists "notes_write" on public.notes;
create policy "notes_write" on public.notes
for all
using (
  public.is_director()
  or user_id = auth.uid()::text
)
with check (
  public.is_director()
  or user_id = auth.uid()::text
);

drop policy if exists "settings_select" on public.user_settings;
create policy "settings_select" on public.user_settings
for select
using (
  deleted_at is null
  and (
    public.is_director()
    or user_id = auth.uid()::text
  )
);

drop policy if exists "settings_write" on public.user_settings;
create policy "settings_write" on public.user_settings
for all
using (
  public.is_director()
  or user_id = auth.uid()::text
)
with check (
  public.is_director()
  or user_id = auth.uid()::text
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "avatars_write" on storage.objects;
create policy "avatars_write" on storage.objects
for all
using (
  bucket_id = 'avatars'
  and (
    public.is_director()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'avatars'
  and (
    public.is_director()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "attachments_read" on storage.objects;
create policy "attachments_read" on storage.objects
for select
using (
  bucket_id = 'attachments'
  and (
    public.is_director()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "attachments_write" on storage.objects;
create policy "attachments_write" on storage.objects
for all
using (
  bucket_id = 'attachments'
  and (
    public.is_director()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'attachments'
  and (
    public.is_director()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create index if not exists idx_profiles_login on public.profiles(login);
create index if not exists idx_profiles_deleted_at on public.profiles(deleted_at);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);
create index if not exists idx_tasks_created_by on public.tasks(created_by);
create index if not exists idx_tasks_deleted_at on public.tasks(deleted_at);
create index if not exists idx_comments_task_id on public.comments(task_id);
create index if not exists idx_comments_deleted_at on public.comments(deleted_at);
create index if not exists idx_task_history_task_id on public.task_history(task_id);
create index if not exists idx_task_history_deleted_at on public.task_history(deleted_at);
create index if not exists idx_notes_user_id on public.notes(user_id);
create index if not exists idx_notes_deleted_at on public.notes(deleted_at);
