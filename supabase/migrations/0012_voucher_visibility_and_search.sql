-- Refine voucher visibility: only those involved can see.
-- Admins no longer see all vouchers by default, only if they are the
-- requester, creator, or a designated officer in the workflow.

drop policy if exists "Users can access relevant vouchers" on public.vouchers;

create policy "Users can access relevant vouchers"
  on public.vouchers for select
  using (
    auth.uid() = requester_id OR
    auth.uid() = created_by OR
    auth.uid() = current_officer_id OR
    auth.uid() = second_approver_id OR
    auth.uid() = third_approver_id OR
    (public.current_user_has_role('FINAL_PAYMENT_OFFICER') AND current_stage = 'FINAL_PAYMENT')
  );

-- Function for admins to search for users when creating a voucher.
create or replace function public.search_profiles(p_query text)
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
  select id, name, user_number
  from public.profiles
  where (
    name ilike '%' || p_query || '%' OR
    user_number ilike '%' || p_query || '%'
  )
  and is_active = true
  limit 10;
$$;
