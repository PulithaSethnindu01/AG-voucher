-- Voucher types catalogue.

create table if not exists public.voucher_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_voucher_types_updated_at on public.voucher_types;
create trigger trg_voucher_types_updated_at
  before update on public.voucher_types
  for each row execute function public.set_updated_at();

insert into public.voucher_types (name) values
  ('Voucher Type 1'),
  ('Voucher Type 2'),
  ('Voucher Type 3'),
  ('Other')
on conflict (name) do nothing;
