-- Database views and helper functions for the UI.

-- View for vouchers with human-readable names and details.
create or replace view public.vouchers_with_details as
select
  v.*,
  requester.name as requester_name,
  requester.user_number as requester_user_number,
  vt.name as voucher_type_name,
  creator.name as created_by_name,
  officer.name as current_officer_name
from public.vouchers v
left join public.profiles requester on requester.id = v.requester_id
left join public.voucher_types vt on vt.id = v.voucher_type_id
left join public.profiles creator on creator.id = v.created_by
left join public.profiles officer on officer.id = v.current_officer_id;

-- Function to get profiles by role (used for approver selection).
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
  select p.id, p.name, p.user_number
  from public.profiles p
  join public.profile_roles pr on pr.profile_id = p.id
  join public.roles r on r.id = pr.role_id
  where r.name = role_name
    and p.is_active = true;
$$;

-- RLS for the view (views inherit RLS from underlying tables, but we can be explicit).
-- Note: In Supabase/Postgres, users need SELECT on the view.
grant select on public.vouchers_with_details to authenticated;
