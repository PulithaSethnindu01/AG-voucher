-- Row Level Security (RLS) Policies.
-- Enforces data access rules at the database level.

-- Enable RLS on all tables.
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profile_roles enable row level security;
alter table public.voucher_types enable row level security;
alter table public.vouchers enable row level security;
alter table public.voucher_history enable row level security;
alter table public.payments enable row level security;
alter table public.app_config enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles RLS
-- ---------------------------------------------------------------------------

-- Users can view their own profile.
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can view other active profiles (needed for selecting approvers).
create policy "Users can view other active profiles"
  on public.profiles for select
  using (is_active = true);

-- Users can insert their own profile during registration.
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile.
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Roles & Permissions RLS (Read-only for all active authenticated users)
-- ---------------------------------------------------------------------------

create policy "Active users can view roles"
  on public.roles for select
  using (public.current_profile_is_active());

create policy "Active users can view permissions"
  on public.permissions for select
  using (public.current_profile_is_active());

create policy "Active users can view role_permissions"
  on public.role_permissions for select
  using (public.current_profile_is_active());

create policy "Active users can view profile_roles"
  on public.profile_roles for select
  using (public.current_profile_is_active());

-- ---------------------------------------------------------------------------
-- Voucher Types RLS
-- ---------------------------------------------------------------------------

create policy "Active users can view voucher types"
  on public.voucher_types for select
  using (public.current_profile_is_active());

-- ---------------------------------------------------------------------------
-- Vouchers RLS
-- ---------------------------------------------------------------------------

-- Access control for vouchers: own, created by, assigned to, or elevated role.
create policy "Users can access relevant vouchers"
  on public.vouchers for select
  using (
    auth.uid() = requester_id OR
    auth.uid() = created_by OR
    auth.uid() = current_officer_id OR
    auth.uid() = second_approver_id OR
    auth.uid() = third_approver_id OR
    public.current_user_has_role('ADMIN') OR
    public.current_user_has_role('FINAL_PAYMENT_OFFICER')
  );

-- Direct updates are forbidden; workflow is handled via SECURITY DEFINER RPCs.
-- This ensures status/stage integrity and immutable history.

-- ---------------------------------------------------------------------------
-- Voucher History RLS
-- ---------------------------------------------------------------------------

create policy "Users can view history of accessible vouchers"
  on public.voucher_history for select
  using (
    exists (
      select 1 from public.vouchers v
      where v.id = voucher_history.voucher_id
    )
  );

-- ---------------------------------------------------------------------------
-- Payments RLS
-- ---------------------------------------------------------------------------

create policy "Users can view payments of accessible vouchers"
  on public.payments for select
  using (
    exists (
      select 1 from public.vouchers v
      where v.id = payments.voucher_id
    )
  );

-- ---------------------------------------------------------------------------
-- App Config RLS
-- ---------------------------------------------------------------------------

create policy "Active users can view app config"
  on public.app_config for select
  using (public.current_profile_is_active());

create policy "Admins can manage app config"
  on public.app_config for all
  using (public.current_user_is_admin());
