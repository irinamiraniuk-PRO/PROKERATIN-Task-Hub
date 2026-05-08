create table if not exists public.users (
  id text primary key,
  name text not null,
  login text not null unique,
  password text not null,
  role text not null check (role in ('director', 'employee')),
  avatar text,
  color text,
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  description text not null,
  created_by text not null references public.users(id) on delete restrict,
  assigned_to text not null references public.users(id) on delete restrict,
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
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id text primary key,
  task_id text not null references public.tasks(id) on delete cascade,
  author_id text not null references public.users(id) on delete cascade,
  text text not null,
  mentions jsonb,
  created_at timestamptz not null
);

create table if not exists public.task_history (
  id text primary key,
  task_id text not null references public.tasks(id) on delete cascade,
  actor_id text not null references public.users(id) on delete restrict,
  action text not null,
  from_status text,
  to_status text,
  meta text,
  created_at timestamptz not null
);

create table if not exists public.notes (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  content text not null,
  emoji text not null,
  color text not null,
  pinned boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id text primary key references public.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
