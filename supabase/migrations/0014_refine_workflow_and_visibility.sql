-- 1. Update approve_to_payment to allow selecting a specific Payment Officer
create or replace function public.approve_to_payment(
  p_voucher_id uuid,
  p_payment_officer_id uuid
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

  -- Verify target is an active Final Payment Officer or Admin
  if not public.profile_has_active_role(p_payment_officer_id, 'FINAL_PAYMENT_OFFICER') then
    raise exception 'Invalid payment officer selected';
  end if;

  update public.vouchers set
    current_stage = 'FINAL_PAYMENT',
    current_officer_id = p_payment_officer_id,
    updated_at = now()
  where id = p_voucher_id;

  perform public.log_voucher_history(
    p_voucher_id, auth.uid(), 'FINAL_APPROVED', 'FINAL_PAYMENT', 'PENDING', 'PENDING', null, 'Final approval complete, assigned to payment officer', p_payment_officer_id
  );
end;
$$;

-- 2. Tighten Visibility: Only requested one can see after completion
drop policy if exists "Strict voucher visibility" on public.vouchers;

create policy "Strict voucher visibility"
  on public.vouchers for select
  using (
    auth.uid() = requester_id OR
    (auth.uid() = current_officer_id AND status != 'PAID')
  );

-- Ensure history follows the same logic
drop policy if exists "Users can view history of accessible vouchers" on public.voucher_history;
create policy "Users can view history of accessible vouchers"
  on public.voucher_history for select
  using (
    exists (
      select 1 from public.vouchers v
      where v.id = voucher_history.voucher_id
    )
  );
