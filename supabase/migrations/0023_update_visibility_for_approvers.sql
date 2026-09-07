-- Update Voucher RLS to allow officers to see vouchers they have previously acted on,
-- but maintain the privacy rule that only the Requester and Supervisor can see PAID vouchers.

DROP POLICY IF EXISTS "Strict voucher visibility" ON public.vouchers;

CREATE POLICY "Strict voucher visibility"
  ON public.vouchers FOR SELECT
  USING (
    -- 1. The Requester can always see their own vouchers
    auth.uid() = requester_id OR

    -- 2. The Supervisor/Boss can always see everything
    public.current_user_has_role('SUPERVISOR') OR

    -- 3. If the voucher is NOT yet paid, it's visible to:
    (status != 'PAID' AND (
        -- a) The person currently responsible for it
        auth.uid() = current_officer_id OR

        -- b) Anyone who has previously approved/forwarded it (recorded in history)
        EXISTS (
          SELECT 1 FROM public.voucher_history vh
          WHERE vh.voucher_id = public.vouchers.id
          AND vh.actor_id = auth.uid()
        )
    ))
  );
