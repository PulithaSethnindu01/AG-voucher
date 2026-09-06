-- Enable pg_cron for scheduled tasks.
-- Note: This requires the extension to be enabled in the Supabase Dashboard
-- or via the extensions settings if not already available.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions to the postgres user to manage cron jobs.
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule a daily cleanup task at 01:00 AM.
-- This task keeps only the 50,000 most recent vouchers.
-- Because of ON DELETE CASCADE, related history and payment records
-- will be automatically deleted.
SELECT cron.schedule(
  'keep-last-50000-vouchers',
  '0 1 * * *', -- Every day at 01:00 AM
  $$
    DELETE FROM public.vouchers
    WHERE id NOT IN (
      SELECT id
      FROM public.vouchers
      ORDER BY created_at DESC
      LIMIT 50000
    );
  $$
);
