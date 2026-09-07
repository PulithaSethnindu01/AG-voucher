-- Update Voucher RLS to allow officers to see vouchers they have acted on.
-- This ensures they can see them in an "Approved" tab even after forwarding.

DROP POLICY IF EXISTS "Strict voucher visibility" ON public.vouchers;

CREATE POLICY "Strict voucher visibility"
  ON public.vouchers FOR SELECT
  USING (
    -- 1. Requester can see their own
    auth.uid() = requester_id OR

    -- 2. Supervisor can see everything
    public.current_user_has_role('SUPERVISOR') OR

    -- 3. Current officer can see it
    auth.uid() = current_officer_id OR

    -- 4. Previous actors can see it
    EXISTS (
      SELECT 1 FROM public.voucher_history vh
      WHERE vh.voucher_id = public.vouchers.id
      AND vh.actor_id = auth.uid()
    )
  );
