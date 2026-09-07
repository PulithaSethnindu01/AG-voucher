-- Remove amount from voucher creation process.
-- The amount will be set during the final payment stage.

-- 1. Drop the existing 7-parameter function
DROP FUNCTION IF EXISTS public.create_voucher(text, uuid, uuid, decimal, text, integer, integer);

-- 2. Create the new 6-parameter function (removed p_amount)
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
  -- Insert voucher (amount is left NULL)
  INSERT INTO public.vouchers (
    voucher_number, requester_id, voucher_type_id, created_by,
    description, status, current_stage, current_officer_id,
    voucher_month, voucher_year
  ) VALUES (
    p_voucher_number, p_requester_id, p_voucher_type_id, auth.uid(),
    p_description, 'PENDING', 'FIRST_APPROVAL', auth.uid(),
    p_voucher_month, p_voucher_year
  ) RETURNING id INTO v_voucher_id;

  -- Log history
  INSERT INTO public.voucher_history (voucher_id, actor_id, action, stage, new_status, notes)
  VALUES (v_voucher_id, auth.uid(), 'CREATED', 'FIRST_APPROVAL', 'PENDING', 'Voucher created');

  RETURN v_voucher_id;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.create_voucher(text, uuid, uuid, text, integer, integer) TO authenticated;
