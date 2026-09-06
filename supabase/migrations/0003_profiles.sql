-- Profiles: application-level user record, linked 1:1 to auth.users.
-- Passwords are NEVER stored here - Supabase Auth owns credentials.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_number text not null unique,
  name text not null,
  mobile_number text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_number_format check (user_number ~ '^[a-z0-9-]{3,20}$'),
  constraint profiles_name_length check (char_length(trim(name)) between 2 and 100),
  constraint profiles_mobile_format check (mobile_number ~ '^[0-9+][0-9\s-]{6,14}$')
);

create index if not exists idx_profiles_user_number on public.profiles(user_number);
create index if not exists idx_profiles_is_active on public.profiles(is_active);

create table if not exists public.profile_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, role_id)
);

create index if not exists idx_profile_roles_profile_id on public.profile_roles(profile_id);
create index if not exists idx_profile_roles_role_id on public.profile_roles(role_id);

-- updated_at maintenance trigger, reused across tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Automatically grant the default EMPLOYEE role whenever a profile is
-- created. Registration flows must NEVER be able to choose their own role;
-- this trigger is the single, database-enforced source of truth for that.
create or replace function public.grant_default_employee_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  employee_role_id uuid;
begin
  select id into employee_role_id from public.roles where name = 'EMPLOYEE';
  if employee_role_id is not null then
    insert into public.profile_roles (profile_id, role_id)
    values (new.id, employee_role_id)
    on conflict (profile_id, role_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_default_role on public.profiles;
create trigger trg_profiles_default_role
  after insert on public.profiles
  for each row execute function public.grant_default_employee_role();
