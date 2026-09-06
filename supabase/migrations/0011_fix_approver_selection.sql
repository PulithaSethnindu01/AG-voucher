-- Update get_profiles_by_role to include ADMIN users in the eligibility list
-- for workflow stages, as ADMINs hold all workflow permissions.
-- This ensures they appear in the selection lists for Second and Third Approvers.

create or replace function public.get_profiles_by_role(role_name text)
returns table (
  id uuid,
  name text,
  user_number text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.id, p.name, p.user_number
  from public.profiles p
  join public.profile_roles pr on pr.profile_id = p.id
  join public.roles r on r.id = pr.role_id
  where (r.name = role_name or r.name = 'ADMIN')
    and p.is_active = true;
$$;
