-- 1. Remove the old specific approver roles from the system.
-- Any active user can now be selected as an approver.

-- Update the Roles constraint to remove the intermediate stages
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_name_check
CHECK (name IN ('EMPLOYEE', 'FINAL_PAYMENT_OFFICER', 'ADMIN', 'SUPERVISOR'));

-- Clean up any existing assignments of the old roles
DELETE FROM public.profile_roles
WHERE role_id IN (SELECT id FROM public.roles WHERE name IN ('FIRST_RECEIVER', 'SECOND_APPROVER', 'THIRD_APPROVER'));

-- Delete the roles themselves
DELETE FROM public.roles WHERE name IN ('FIRST_RECEIVER', 'SECOND_APPROVER', 'THIRD_APPROVER');

-- 2. Update get_profiles_by_role to be more generic.
-- Since there are no specific roles, this function will now return ALL active users
-- who could potentially act as an approver.
CREATE OR REPLACE FUNCTION public.get_profiles_by_role(role_name text DEFAULT NULL)
RETURNS TABLE (id uuid, name text, user_number text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- If role_name is provided, filter by it (useful for FINAL_PAYMENT_OFFICER lookup).
  -- If NULL, return all active profiles (useful for the intermediate approver chain).
  SELECT DISTINCT p.id, p.name, p.user_number
  FROM public.profiles p
  LEFT JOIN public.profile_roles pr ON pr.profile_id = p.id
  LEFT JOIN public.roles r ON r.id = pr.role_id
  WHERE p.is_active = true
    AND (
      role_name IS NULL
      OR r.name = role_name
      OR r.name = 'ADMIN'
      OR r.name = 'SUPERVISOR'
    );
$$;

-- 3. Update the validation helper
CREATE OR REPLACE FUNCTION public.profile_has_active_role(target_profile_id uuid, role_name text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.profile_roles pr ON pr.profile_id = p.id
    LEFT JOIN public.roles r ON r.id = pr.role_id
    WHERE p.id = target_profile_id
      AND p.is_active = true
      AND (
        role_name IS NULL
        OR r.name = role_name
        OR r.name = 'ADMIN'
        OR r.name = 'SUPERVISOR'
      )
  );
$$;

-- 4. Update approval functions to reflect the dynamic nature
CREATE OR REPLACE FUNCTION public.approve_and_forward(p_voucher_id uuid, p_next_approver_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Basic security checks
  IF NOT EXISTS (SELECT 1 FROM public.vouchers WHERE id = p_voucher_id AND current_officer_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.vouchers SET
    current_stage = 'SECOND_APPROVAL', -- Loop stage
    current_officer_id = p_next_approver_id,
    is_received = false,
    updated_at = now()
  WHERE id = p_voucher_id;

  PERFORM public.log_voucher_history(p_voucher_id, auth.uid(), 'APPROVED_AND_FORWARDED', 'SECOND_APPROVAL', 'PENDING', 'PENDING', NULL, NULL, p_next_approver_id);
END; $$;
