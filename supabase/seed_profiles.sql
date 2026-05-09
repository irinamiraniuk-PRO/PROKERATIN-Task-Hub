insert into public.profiles (id, login, name, role, avatar, color, deleted_at, updated_at)
values
  ('irina', 'irina', 'Ирина Миранюк', 'director', null, '#C08A4A', null, now()),
  ('ulyana', 'ulyana', 'Ульяна', 'employee', null, '#D98A4A', null, now()),
  ('natali', 'natali', 'Натали', 'employee', null, '#D98A4A', null, now()),
  ('marina', 'marina', 'Марина', 'employee', null, '#D98A4A', null, now())
on conflict (login) do update set
  name = excluded.name,
  role = excluded.role,
  color = excluded.color,
  avatar = excluded.avatar,
  deleted_at = null,
  updated_at = now();
