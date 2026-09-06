-- Secure RPC functions for the Voucher Workflow.
-- All functions are SECURITY DEFINER to handle workflow transitions safely.

-- Helper to record history
create or replace function public.log_voucher_history(
  p_voucher_id uuid,
  p_actor_id uuid,
  p_action text,
  p_stage public.voucher_stage,
  p_prev_status public.voucher_status,
  p_new_status public.voucher_status,
  p_rejection_reason text default null,
  p_notes text default null,
  p_assigned_to_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.voucher_history (
    voucher_id, actor_id, action, stage,
    previous_status, new_status, rejection_reason, notes, assigned_to_id
  ) values (
    p_voucher_id, p_actor_id, p_action, p_stage,
    p_prev_status, p_new_status, p_rejection_reason, p_notes, p_assigned_to_id
  );
end;
$$;

-- Create Voucher
create or replace function public.create_voucher(
  p_voucher_number text,
  p_requester_id uuid,
  p_voucher_type_id uuid,
  p_amount decimal(12,2),
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher_id uuid;
begin
  -- 1. Verify permission
  if not public.current_user_has_permission('voucher.create') then
    raise exception 'Unauthorized to create vouchers';
  end if;

  -- 2. Insert voucher
  insert into public.vouchers (
    voucher_number, requester_id, voucher_type_id, created_by,
    amount, description, status, current_stage, current_officer_id
  ) values (
    p_voucher_number, p_requester_id, p_voucher_type_id, auth.uid(),
    p_amount, p_description, 'PENDING', 'FIRST_APPROVAL', auth.uid()
  ) returning id into v_voucher_id;

  -- 3. Log history
  perform public.log_voucher_history(
    v_voucher_id, auth.uid(), 'CREATED', 'FIRST_APPROVAL', null, 'PENDING', null, 'Voucher created'
  );

  return v_voucher_id;
end;
$$;

-- First Approval & Assign Second Approver
create or replace function public.first_approve_voucher(
  p_voucher_id uuid,
  p_second_approver_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher record;
begin
  -- 1. Verify current user and stage
  select * into v_voucher from public.vouchers where id = p_voucher_id;
  if v_voucher is null then raise exception 'Voucher not found'; end if;

  if v_voucher.current_stage != 'FIRST_APPROVAL' or v_voucher.status != 'PENDING' then
    raise exception 'Voucher is not at First Approval stage';
  end if;

  if not (public.current_user_has_permission('voucher.first_approve') and v_voucher.current_officer_id = auth.uid()) then
    raise exception 'Unauthorized to approve this voucher at this stage';
  end if;

  -- 2. Verify target approver
  if not public.profile_has_active_role(p_second_approver_id, 'SECOND_APPROVER') then
    raise exception 'Invalid second approver';
  end if;

  -- 3. Update voucher
  update public.vouchers set
    current_stage = 'SECOND_APPROVAL',
    current_officer_id = p_second_approver_id,
    second_approver_id = p_second_approver_id,
    updated_at = now()
  where id = p_voucher_id;

  -- 4. Log history
  perform public.log_voucher_history(
    p_voucher_id, auth.uid(), 'FIRST_APPROVED', 'SECOND_APPROVAL', 'PENDING', 'PENDING', null, 'First approval complete', p_second_approver_id
  );
end;
$$;

-- Second Approval & Assign Third Approver
create or replace function public.second_approve_voucher(
  p_voucher_id uuid,
  p_third_approver_id uuid
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

  if v_voucher.current_stage != 'SECOND_APPROVAL' or v_voucher.status != 'PENDING' then
    raise exception 'Voucher is not at Second Approval stage';
  end if;

  if v_voucher.current_officer_id != auth.uid() then
    raise exception 'Unauthorized: You are not the assigned officer';
  end if;

  if not public.profile_has_active_role(p_third_approver_id, 'THIRD_APPROVER') then
    raise exception 'Invalid third approver';
  end if;

  update public.vouchers set
    current_stage = 'THIRD_APPROVAL',
    current_officer_id = p_third_approver_id,
    third_approver_id = p_third_approver_id,
    updated_at = now()
  where id = p_voucher_id;

  perform public.log_voucher_history(
    p_voucher_id, auth.uid(), 'SECOND_APPROVED', 'THIRD_APPROVAL', 'PENDING', 'PENDING', null, 'Second approval complete', p_third_approver_id
  );
end;
$$;

-- Third Approval
create or replace function public.third_approve_voucher(
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

  if v_voucher.current_stage != 'THIRD_APPROVAL' or v_voucher.status != 'PENDING' then
    raise exception 'Voucher is not at Third Approval stage';
  end if;

  if v_voucher.current_officer_id != auth.uid() then
    raise exception 'Unauthorized: You are not the assigned officer';
  end if;

  -- Get final payment officer from config
  select value::uuid into v_payment_officer_id from public.app_config where key = 'final_payment_officer_id';
  if v_payment_officer_id is null then
    raise exception 'Final Payment Officer not configured';
  end if;

  update public.vouchers set
    current_stage = 'FINAL_PAYMENT',
    current_officer_id = v_payment_officer_id,
    updated_at = now()
  where id = p_voucher_id;

  perform public.log_voucher_history(
    p_voucher_id, auth.uid(), 'THIRD_APPROVED', 'FINAL_PAYMENT', 'PENDING', 'PENDING', null, 'Third approval complete', v_payment_officer_id
  );
end;
$$;

-- Reject Voucher
create or replace function public.reject_voucher(
  p_voucher_id uuid,
  p_rejection_reason text
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
    raise exception 'Only pending vouchers can be rejected';
  end if;

  if v_voucher.current_officer_id != auth.uid() then
    raise exception 'Unauthorized to reject this voucher';
  end if;

  if p_rejection_reason is null or trim(p_rejection_reason) = '' then
    raise exception 'Rejection reason is required';
  end if;

  update public.vouchers set
    status = 'REJECTED',
    rejection_reason = p_rejection_reason,
    updated_at = now()
  where id = p_voucher_id;

  perform public.log_voucher_history(
    p_voucher_id, auth.uid(), 'REJECTED', v_voucher.current_stage, 'PENDING', 'REJECTED', p_rejection_reason
  );
end;
$$;

-- Resubmit Voucher
create or replace function public.resubmit_voucher(
  p_voucher_id uuid
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

  if v_voucher.status != 'REJECTED' then
    raise exception 'Only rejected vouchers can be resubmitted';
  end if;

  -- Resubmission is handled by the officer at the stage it was rejected
  if v_voucher.current_officer_id != auth.uid() then
    raise exception 'Unauthorized to resubmit this voucher';
  end if;

  update public.vouchers set
    status = 'PENDING',
    rejection_reason = null,
    updated_at = now()
  where id = p_voucher_id;

  perform public.log_voucher_history(
    p_voucher_id, auth.uid(), 'RESUBMITTED', v_voucher.current_stage, 'REJECTED', 'PENDING'
  );
end;
$$;

-- Mark Paid
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

  if not public.current_user_has_role('FINAL_PAYMENT_OFFICER') then
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
    amount = p_amount, -- ensure final amount matches payment
    updated_at = now()
  where id = p_voucher_id;

  -- 3. Log history
  perform public.log_voucher_history(
    p_voucher_id, auth.uid(), 'PAID', 'COMPLETED', 'PENDING', 'PAID', null, 'Payment completed'
  );
end;
$$;
