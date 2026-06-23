-- =====================================================================
--  CONFIGURACION DE USUARIOS PARA LA APP  (Hotel Daily Control)
--  Ejecutar UNA vez en Supabase: Dashboard -> SQL Editor -> Run.
--  Es idempotente (se puede repetir sin error).
-- =====================================================================

-- 1) Tabla profiles (si no existe, la crea).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'Recepción',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2) Politicas RLS (se borran y recrean para no duplicar).
drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "profiles_self_insert" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;

-- Cada usuario ve y edita SU propio perfil.
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- Funcion SECURITY DEFINER para comprobar rol Admin sin recursion de RLS.
-- (Si hicieramos el select sobre profiles dentro de la policy, Postgres
--  re-evaluaria RLS de profiles -> infinite recursion. Esta funcion lo evita.)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'Administrador'
  );
$$;

-- El Administrador puede ver, crear, editar y borrar TODOS los perfiles.
create policy "profiles_admin_all" on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Restringir los roles validos.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('Administrador', 'Dirección', 'Recepción', 'Limpieza', 'Mantenimiento'));

-- 3) Trigger: crear perfil automaticamente cuando se registra un usuario nuevo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'Recepción',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Backfill: crear perfiles para usuarios de Auth que aun no tengan uno.
insert into public.profiles (id, email, full_name, role, is_active)
select id, email, split_part(email, '@', 1), 'Recepción', true
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);