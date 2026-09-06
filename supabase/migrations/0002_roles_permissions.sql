-- Roles & permissions: normalized authorization model. Authorization
-- decisions are enforced in the database (RLS + SECURITY DEFINER
-- functions), never solely in the frontend.

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (
    name in ('EMPLOYEE', 'FIRST_RECEIVER', 'SECOND_APPROVER', 'THIRD_APPROVER', 'FINAL_PAYMENT_OFFICER', 'ADMIN')
  ),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create index if not exists idx_role_permissions_role_id on public.role_permissions(role_id);
create index if not exists idx_role_permissions_permission_id on public.role_permissions(permission_id);

-- Seed fixed role catalogue.
insert into public.roles (name, description) values
  ('EMPLOYEE', 'Standard employee. Default role granted on registration.'),
  ('FIRST_RECEIVER', 'Creates vouchers and performs first-stage approval.'),
  ('SECOND_APPROVER', 'Performs second-stage approval.'),
  ('THIRD_APPROVER', 'Performs third-stage approval.'),
  ('FINAL_PAYMENT_OFFICER', 'Authorized to mark vouchers as paid.'),
  ('ADMIN', 'Full administrative access.')
on conflict (name) do nothing;

-- Seed permission catalogue.
insert into public.permissions (code, description) values
  ('voucher.create', 'Create a new voucher'),
  ('voucher.first_approve', 'Perform first-stage approval'),
  ('voucher.second_approve', 'Perform second-stage approval'),
  ('voucher.third_approve', 'Perform third-stage approval'),
  ('voucher.reject', 'Reject a voucher at an assigned stage'),
  ('voucher.resubmit', 'Resubmit a rejected voucher'),
  ('voucher.pay', 'Mark a voucher as paid'),
  ('approver.assign_second', 'Assign/reassign the second approver'),
  ('approver.assign_third', 'Assign/reassign the third approver'),
  ('config.manage_final_payment_officer', 'Configure the final payment officer'),
  ('admin.full_access', 'Full administrative access to all records')
on conflict (code) do nothing;

-- Map default (non-admin) role -> permission grants.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on (
  (r.name = 'FIRST_RECEIVER' and p.code in ('voucher.create', 'voucher.first_approve', 'approver.assign_second', 'voucher.reject', 'voucher.resubmit'))
  or (r.name = 'SECOND_APPROVER' and p.code in ('voucher.second_approve', 'approver.assign_third', 'voucher.reject', 'voucher.resubmit'))
  or (r.name = 'THIRD_APPROVER' and p.code in ('voucher.third_approve', 'voucher.reject', 'voucher.resubmit'))
  or (r.name = 'FINAL_PAYMENT_OFFICER' and p.code in ('voucher.pay'))
  or (r.name = 'ADMIN' and p.code in (
    'voucher.create', 'voucher.first_approve', 'voucher.second_approve', 'voucher.third_approve',
    'voucher.reject', 'voucher.resubmit', 'voucher.pay', 'approver.assign_second', 'approver.assign_third',
    'config.manage_final_payment_officer', 'admin.full_access'
  ))
)
on conflict (role_id, permission_id) do nothing;
