-- 1. Add the SUPERVISOR role
INSERT INTO public.roles (name, description)
VALUES ('SUPERVISOR', 'The Boss: Full visibility into all voucher records and history.')
ON CONFLICT (name) DO NOTHING;

-- 2. Update Voucher RLS Policy to allow SUPERVISOR to see everything
-- We drop the existing strict policy and recreate it with the SUPERVISOR check.
DROP POLICY IF EXISTS "Strict voucher visibility" ON public.vouchers;

CREATE POLICY "Strict voucher visibility"
  ON public.vouchers FOR SELECT
  USING (
    auth.uid() = requester_id OR
    (auth.uid() = current_officer_id AND status != 'PAID') OR
    public.current_user_has_role('SUPERVISOR') OR
    public.current_user_has_role('ADMIN') -- Re-enabling for ADMIN as well, common for "Boss" roles
  );

-- 3. Ensure the history policy follows the same logic (it already does by referencing vouchers)
-- but we'll ensure the SUPERVISOR can see all history entries directly if needed.
DROP POLICY IF EXISTS "Users can view history of accessible vouchers" ON public.voucher_history;

CREATE POLICY "Users can view history of accessible vouchers"
  ON public.voucher_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vouchers v
      WHERE v.id = voucher_history.voucher_id
    ) OR
    public.current_user_has_role('SUPERVISOR') OR
    public.current_user_has_role('ADMIN')
  );
