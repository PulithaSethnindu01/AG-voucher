-- Add voucher_month and voucher_year to vouchers table
ALTER TABLE public.vouchers
ADD COLUMN voucher_month integer CHECK (voucher_month BETWEEN 1 AND 12),
ADD COLUMN voucher_year integer CHECK (voucher_year BETWEEN 2000 AND 2100);

-- Update the view to include these fields
CREATE OR REPLACE VIEW public.vouchers_with_details
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

-- Update the create_voucher function
CREATE OR REPLACE FUNCTION public.create_voucher(
  p_voucher_number text,
  p_requester_id uuid,
  p_voucher_type_id uuid,
  p_amount decimal(12,2),
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
  -- 1. Verify permission
  IF NOT public.current_user_has_permission('voucher.create') THEN
    RAISE EXCEPTION 'Unauthorized to create vouchers';
  END IF;

  -- 2. Insert voucher
  INSERT INTO public.vouchers (
    voucher_number, requester_id, voucher_type_id, created_by,
    amount, description, status, current_stage, current_officer_id,
    voucher_month, voucher_year
  ) VALUES (
    p_voucher_number, p_requester_id, p_voucher_type_id, auth.uid(),
    p_amount, p_description, 'PENDING', 'FIRST_APPROVAL', auth.uid(),
    p_voucher_month, p_voucher_year
  ) RETURNING id INTO v_voucher_id;

  -- 3. Log history
  PERFORM public.log_voucher_history(
    v_voucher_id, auth.uid(), 'CREATED', 'FIRST_APPROVAL', NULL, 'PENDING', NULL, 'Voucher created'
  );

  RETURN v_voucher_id;
END;
$$;
