-- Update the vouchers_with_details view to include the actual payment timestamp
-- and separate columns for paid_month and paid_year to facilitate filtering.

DROP VIEW IF EXISTS public.vouchers_with_details;

CREATE VIEW public.vouchers_with_details
WITH (security_invoker = true) AS
SELECT
  v.*,
  requester.name AS requester_name,
  requester.user_number AS requester_user_number,
  vt.name AS voucher_type_name,
  creator.name AS created_by_name,
  officer.name AS current_officer_name,
  p.paid_at AS actual_paid_at,
  EXTRACT(MONTH FROM p.paid_at) AS actual_paid_month,
  EXTRACT(YEAR FROM p.paid_at) AS actual_paid_year
FROM public.vouchers v
LEFT JOIN public.profiles requester ON requester.id = v.requester_id
LEFT JOIN public.voucher_types vt ON vt.id = v.voucher_type_id
LEFT JOIN public.profiles creator ON creator.id = v.created_by
LEFT JOIN public.profiles officer ON officer.id = v.current_officer_id
LEFT JOIN public.payments p ON p.voucher_id = v.id;
