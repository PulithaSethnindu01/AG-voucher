-- Refinements to workflow RPCs and security.

-- Fix mark_voucher_paid to verify the assigned officer.
create or replace function public.mark_voucher_paid(
  p_voucher_id uuid,
  p_amount decimal(12,2),
  p_payment_reference text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher record;
begin
  select * into v_voucher from public.vouchers where id = p_voucher_id;
  if v_voucher is null then raise exception 'Voucher not found'; end if;

  if v_voucher.current_stage != 'FINAL_PAYMENT' or v_voucher.status != 'PENDING' then
    raise exception 'Voucher is not ready for payment';
  end if;

  -- Ensure the caller is the assigned officer OR an admin
  if v_voucher.current_officer_id != auth.uid() and not public.current_user_is_admin() then
    raise exception 'Unauthorized: You are not the assigned payment officer';
  end if;

  if not public.current_user_has_role('FINAL_PAYMENT_OFFICER') and not public.current_user_is_admin() then
    raise exception 'Unauthorized: Only Final Payment Officers can mark as paid';
  end if;

  -- 1. Create payment record
  insert into public.payments (
    voucher_id, amount, payment_reference, paid_by
  ) values (
    p_voucher_id, p_amount, p_payment_reference, auth.uid()
  );

  -- 2. Update voucher
  update public.vouchers set
    status = 'PAID',
    current_stage = 'COMPLETED',
    amount = p_amount,
    updated_at = now()
  where id = p_voucher_id;

  -- 3. Log history
  perform public.log_voucher_history(
    p_voucher_id, auth.uid(), 'PAID', 'COMPLETED', 'PENDING', 'PAID', null, 'Payment completed'
  );
end;
$$;

-- Add function to update user roles (Admin only).
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
  if not public.current_user_is_admin() then
    raise exception 'Unauthorized: Only admins can manage roles';
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
    -- Prevent removing the last admin if it's self? (optional safeguard)
    delete from public.profile_roles
    where profile_id = p_profile_id and role_id = v_role_id;
  end if;
end;
$$;

-- Add function to toggle user active status (Admin only).
create or replace function public.toggle_user_status(
  p_profile_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Unauthorized: Only admins can manage users';
  end if;

  update public.profiles
  set is_active = p_is_active, updated_at = now()
  where id = p_profile_id;
end;
$$;

-- Add function to update app config (Admin only).
create or replace function public.set_app_config(
  p_key text,
  p_value text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Unauthorized: Only admins can manage configuration';
  end if;

  insert into public.app_config (key, value, updated_by, updated_at)
  values (p_key, p_value, auth.uid(), now())
  on conflict (key) do update
  set value = excluded.value, updated_by = auth.uid(), updated_at = now();
end;
$$;
