-- Secure helper functions used throughout RLS policies and RPC functions.
-- All are SECURITY DEFINER with a locked search_path to avoid privilege
-- escalation / search_path hijacking, and all are STABLE where possible.

-- Returns true if the currently authenticated user's profile is active.
create or replace function public.current_profile_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_active from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Returns true if the currently authenticated user holds the given role
-- AND their profile is active.
create or replace function public.current_user_has_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.roles r on r.id = pr.role_id
    join public.profiles p on p.id = pr.profile_id
    where pr.profile_id = auth.uid()
      and r.name = role_name
      and p.is_active = true
  );
$$;

-- Returns true if the currently authenticated user holds the given
-- permission (via any assigned role) AND their profile is active.
create or replace function public.current_user_has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.role_permissions rp on rp.role_id = pr.role_id
    join public.permissions perm on perm.id = rp.permission_id
    join public.profiles p on p.id = pr.profile_id
    where pr.profile_id = auth.uid()
      and perm.code = permission_code
      and p.is_active = true
  );
$$;

-- Returns true if the given (target) profile is active and holds the given
-- role. Used to validate approver/officer assignment targets.
create or replace function public.profile_has_active_role(target_profile_id uuid, role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.roles r on r.id = pr.role_id
    join public.profiles p on p.id = pr.profile_id
    where pr.profile_id = target_profile_id
      and r.name = role_name
      and p.is_active = true
  );
$$;

-- Returns true if the currently authenticated user is an ADMIN (active).
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_role('ADMIN');
$$;
