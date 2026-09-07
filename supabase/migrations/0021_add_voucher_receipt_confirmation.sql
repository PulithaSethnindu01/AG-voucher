-- Add is_received column to vouchers to track if the current officer has acknowledged it.
ALTER TABLE public.vouchers
ADD COLUMN is_received boolean NOT NULL DEFAULT false;

-- The creator of the voucher is also the first officer, so they receive it automatically.
UPDATE public.vouchers SET is_received = true WHERE current_stage = 'FIRST_APPROVAL';

-- Update the view to include is_received
DROP VIEW IF EXISTS public.vouchers_with_details;
CREATE VIEW public.vouchers_with_details
WITH (security_invoker = true) AS
SELECT
  v.*,
  requester.name AS requester_name,
  requester.user_number AS requester_user_number,
  vt.name AS voucher_type_name,
  creator.name AS created_by_name,
  officer.name AS current_officer_name
FROM public.vouchers v
LEFT JOIN public.profiles requester ON requester.id = v.requester_id
LEFT JOIN public.voucher_types vt ON vt.id = v.voucher_type_id
LEFT JOIN public.profiles creator ON creator.id = v.created_by
LEFT JOIN public.profiles officer ON officer.id = v.current_officer_id;

-- Update create_voucher to set is_received = true
CREATE OR REPLACE FUNCTION public.create_voucher(
  p_voucher_number text,
  p_requester_id uuid,
  p_voucher_type_id uuid,
  p_description text,
  p_voucher_month integer,
  p_voucher_year integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher_id uuid;
BEGIN
  INSERT INTO public.vouchers (
    voucher_number, requester_id, voucher_type_id, created_by,
    description, status, current_stage, current_officer_id,
    voucher_month, voucher_year, is_received
  ) VALUES (
    p_voucher_number, p_requester_id, p_voucher_type_id, auth.uid(),
    p_description, 'PENDING', 'FIRST_APPROVAL', auth.uid(),
    p_voucher_month, p_voucher_year, true
  ) RETURNING id INTO v_voucher_id;

  PERFORM public.log_voucher_history(
    v_voucher_id, auth.uid(), 'CREATED', 'FIRST_APPROVAL', NULL, 'PENDING', NULL, 'Voucher created'
  );

  RETURN v_voucher_id;
END;
$$;

-- Update approve_and_forward to set is_received = false
CREATE OR REPLACE FUNCTION public.approve_and_forward(
  p_voucher_id uuid,
  p_next_approver_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vouchers SET
    current_stage = 'SECOND_APPROVAL',
    current_officer_id = p_next_approver_id,
    second_approver_id = p_next_approver_id,
    is_received = false, -- Reset receipt status for the new officer
    updated_at = now()
  WHERE id = p_voucher_id;

  PERFORM public.log_voucher_history(
    p_voucher_id, auth.uid(), 'APPROVED_AND_FORWARDED', 'SECOND_APPROVAL', 'PENDING', 'PENDING', null, 'Approved and forwarded to next officer', p_next_approver_id
  );
END;
$$;

-- Update approve_to_payment to set is_received = false
CREATE OR REPLACE FUNCTION public.approve_to_payment(
  p_voucher_id uuid,
  p_payment_officer_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vouchers SET
    current_stage = 'FINAL_PAYMENT',
    current_officer_id = p_payment_officer_id,
    is_received = false, -- Reset receipt status for the payer
    updated_at = now()
  WHERE id = p_voucher_id;

  PERFORM public.log_voucher_history(
    p_voucher_id, auth.uid(), 'FINAL_APPROVED', 'FINAL_PAYMENT', 'PENDING', 'PENDING', null, 'Final approval complete, assigned to payment officer', p_payment_officer_id
  );
END;
$$;

-- New function to confirm receipt
CREATE OR REPLACE FUNCTION public.confirm_voucher_receipt(
  p_voucher_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher record;
BEGIN
  SELECT * INTO v_voucher FROM public.vouchers WHERE id = p_voucher_id;
  IF v_voucher IS NULL THEN RAISE EXCEPTION 'Voucher not found'; END IF;

  IF v_voucher.current_officer_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You are not the assigned officer';
  END IF;

  UPDATE public.vouchers SET
    is_received = true,
    updated_at = now()
  WHERE id = p_voucher_id;

  PERFORM public.log_voucher_history(
    p_voucher_id, auth.uid(), 'RECEIVED', v_voucher.current_stage, v_voucher.status, v_voucher.status, null, 'Voucher receipt confirmed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_voucher_receipt(uuid) TO authenticated;
