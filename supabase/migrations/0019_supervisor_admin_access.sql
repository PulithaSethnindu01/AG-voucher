-- Update current_user_is_admin helper to include the SUPERVISOR role.
-- This effectively grants the Supervisor role administrative power over
-- user roles, status, and system configuration.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_role('ADMIN') or public.current_user_has_role('SUPERVISOR');
$$;

-- Grant all existing permissions to the SUPERVISOR role.
-- This ensures that any check using current_user_has_permission(...)
-- will pass for a Supervisor as well.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'SUPERVISOR'
on conflict (role_id, permission_id) do nothing;

-- Updated update_user_role function with restricted access for administrative roles.
-- Now, only a SUPERVISOR can grant or revoke the 'ADMIN' or 'SUPERVISOR' roles.
-- Standard ADMINs can still manage other roles (like EMPLOYEE, FIRST_RECEIVER, etc.).
create or replace function public.update_user_role(
  p_profile_id uuid,
  p_role_name text,
  p_action text -- 'ADD' or 'REMOVE'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
begin
  -- 1. General check: must be at least an Admin or Supervisor
  if not public.current_user_is_admin() then
    raise exception 'Unauthorized: Only admins or supervisors can manage roles';
  end if;

  -- 2. Strict restriction: Only SUPERVISOR can manage high-level roles (ADMIN/SUPERVISOR)
  if (p_role_name = 'ADMIN' or p_role_name = 'SUPERVISOR') and not public.current_user_has_role('SUPERVISOR') then
    raise exception 'Access Denied: Only the supervisor can manage administrative roles';
  end if;

  select id into v_role_id from public.roles where name = p_role_name;
  if v_role_id is null then
    raise exception 'Role not found';
  end if;

  if p_action = 'ADD' then
    insert into public.profile_roles (profile_id, role_id)
    values (p_profile_id, v_role_id)
    on conflict (profile_id, role_id) do nothing;
  elsif p_action = 'REMOVE' then
    delete from public.profile_roles
    where profile_id = p_profile_id and role_id = v_role_id;
  end if;
end;
$$;
