-- Flexible Approval Chain: Allows an arbitrary number of approvers.
-- Officers at any approval stage can now either forward to another approver
-- or send the voucher to the Final Payment stage.

-- 1. Create a generalized function for forwarding to another approver
create or replace function public.approve_and_forward(
  p_voucher_id uuid,
  p_next_approver_id uuid
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

  if v_voucher.status != 'PENDING' then
    raise exception 'Voucher is not in pending status';
  end if;

  if v_voucher.current_officer_id != auth.uid() then
    raise exception 'Unauthorized: You are not the assigned officer';
  end if;

  -- Verify target approver is active and eligible (Role or Admin)
  if not public.profile_has_active_role(p_next_approver_id, 'SECOND_APPROVER') then
    raise exception 'Invalid next approver';
  end if;

  update public.vouchers set
    current_stage = 'SECOND_APPROVAL', -- We treat SECOND_APPROVAL as the intermediate loop stage
    current_officer_id = p_next_approver_id,
    second_approver_id = p_next_approver_id,
    updated_at = now()
  where id = p_voucher_id;

  perform public.log_voucher_history(
    p_voucher_id, auth.uid(), 'APPROVED_AND_FORWARDED', 'SECOND_APPROVAL', 'PENDING', 'PENDING', null, 'Approved and forwarded to next officer', p_next_approver_id
  );
end;
$$;

-- 2. Create a generalized function for final approval (sending to payment)
create or replace function public.approve_to_payment(
  p_voucher_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher record;
  v_payment_officer_id uuid;
begin
  select * into v_voucher from public.vouchers where id = p_voucher_id;
  if v_voucher is null then raise exception 'Voucher not found'; end if;

  if v_voucher.status != 'PENDING' then
    raise exception 'Voucher is not in pending status';
  end if;

  if v_voucher.current_officer_id != auth.uid() then
    raise exception 'Unauthorized: You are not the assigned officer';
  end if;

  -- Get final payment officer from config
  select value::uuid into v_payment_officer_id from public.app_config where key = 'final_payment_officer_id';
  if v_payment_officer_id is null then
    raise exception 'Final Payment Officer not configured. Please contact an administrator.';
  end if;

  update public.vouchers set
    current_stage = 'FINAL_PAYMENT',
    current_officer_id = v_payment_officer_id,
    updated_at = now()
  where id = p_voucher_id;

  perform public.log_voucher_history(
    p_voucher_id, auth.uid(), 'FINAL_APPROVED', 'FINAL_PAYMENT', 'PENDING', 'PENDING', null, 'Final approval complete, sent to payment', v_payment_officer_id
  );
end;
$$;

-- Grant execution permissions
grant execute on function public.approve_and_forward(uuid, uuid) to authenticated;
grant execute on function public.approve_to_payment(uuid) to authenticated;
