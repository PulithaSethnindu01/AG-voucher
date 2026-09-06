-- Vouchers, history, payments and workflow configuration.

-- Workflow configuration (e.g. final payment officer assignment).
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- Voucher statuses and stages are managed via these types in the DB
-- to ensure integrity.
do $$ begin
  create type public.voucher_status as enum ('PENDING', 'REJECTED', 'PAID');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.voucher_stage as enum (
    'FIRST_APPROVAL',
    'SECOND_APPROVAL',
    'THIRD_APPROVAL',
    'FINAL_PAYMENT',
    'COMPLETED'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  voucher_number text not null unique,
  requester_id uuid not null references public.profiles(id),
  voucher_type_id uuid not null references public.voucher_types(id),
  created_by uuid not null references public.profiles(id),
  amount decimal(12,2),
  description text,
  status public.voucher_status not null default 'PENDING',
  current_stage public.voucher_stage not null default 'FIRST_APPROVAL',
  current_officer_id uuid references public.profiles(id),
  second_approver_id uuid references public.profiles(id),
  third_approver_id uuid references public.profiles(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Integrity constraints
  constraint voucher_number_format check (voucher_number ~ '^[A-Z0-9-]{3,20}$')
);

create index if not exists idx_vouchers_requester_id on public.vouchers(requester_id);
create index if not exists idx_vouchers_status on public.vouchers(status);
create index if not exists idx_vouchers_current_stage on public.vouchers(current_stage);
create index if not exists idx_vouchers_current_officer_id on public.vouchers(current_officer_id);

drop trigger if exists trg_vouchers_updated_at on public.vouchers;
create trigger trg_vouchers_updated_at
  before update on public.vouchers
  for each row execute function public.set_updated_at();

-- Immutable workflow history.
create table if not exists public.voucher_history (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.vouchers(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  stage public.voucher_stage not null,
  previous_status public.voucher_status,
  new_status public.voucher_status,
  rejection_reason text,
  notes text,
  assigned_to_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_voucher_history_voucher_id on public.voucher_history(voucher_id);

-- Payments.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.vouchers(id) on delete cascade,
  amount decimal(12,2) not null check (amount > 0),
  payment_reference text not null,
  paid_by uuid not null references public.profiles(id),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_voucher_id on public.payments(voucher_id);
