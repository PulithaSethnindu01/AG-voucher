/**
 * Clean TypeScript types/interfaces mirroring the Supabase/PostgreSQL schema.
 *
 * These types describe DATA SHAPES ONLY. Business logic (workflow rules,
 * permission checks, transition validation) lives in PostgreSQL functions
 * and RLS policies, not here. Do not duplicate that logic in the frontend.
 */

// ---------------------------------------------------------------------------
// Roles & Permissions
// ---------------------------------------------------------------------------

export type RoleName =
  | 'EMPLOYEE'
  | 'FIRST_RECEIVER'
  | 'SECOND_APPROVER'
  | 'THIRD_APPROVER'
  | 'FINAL_PAYMENT_OFFICER'
  | 'ADMIN'
  | 'SUPERVISOR'

export interface Role {
  id: string
  name: RoleName
  description: string | null
  created_at: string
}

export interface Permission {
  id: string
  code: string
  description: string | null
  created_at: string
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export interface Profile {
  id: string // == auth.users.id
  user_number: string
  name: string
  mobile_number: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProfileRole {
  id: string
  profile_id: string
  role_id: string
  created_at: string
}

/** Convenience shape used once roles are joined/aggregated for a profile. */
export interface ProfileWithRoles extends Profile {
  roles: RoleName[]
}

// ---------------------------------------------------------------------------
// Voucher Types
// ---------------------------------------------------------------------------

export interface VoucherType {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Vouchers
// ---------------------------------------------------------------------------

export type VoucherStatus = 'PENDING' | 'REJECTED' | 'PAID'

export type VoucherStage =
  | 'FIRST_APPROVAL'
  | 'SECOND_APPROVAL'
  | 'THIRD_APPROVAL'
  | 'FINAL_PAYMENT'
  | 'COMPLETED'

export interface Voucher {
  id: string
  voucher_number: string
  requester_id: string
  voucher_type_id: string
  created_by: string
  amount: number | null
  description: string | null
  status: VoucherStatus
  current_stage: VoucherStage
  current_officer_id: string | null
  second_approver_id: string | null
  third_approver_id: string | null
  final_payment_officer_id: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

/** Voucher joined with commonly-needed display fields via a view/RPC. */
export interface VoucherWithDetails extends Voucher {
  requester_name: string | null
  requester_user_number: string | null
  voucher_type_name: string | null
  created_by_name: string | null
  current_officer_name: string | null
}

// ---------------------------------------------------------------------------
// Voucher History (append-only)
// ---------------------------------------------------------------------------

export type VoucherHistoryAction =
  | 'CREATED'
  | 'FIRST_APPROVED'
  | 'SECOND_APPROVED'
  | 'THIRD_APPROVED'
  | 'REJECTED'
  | 'RESUBMITTED'
  | 'PAID'
  | 'ASSIGNED_SECOND_APPROVER'
  | 'ASSIGNED_THIRD_APPROVER'

export interface VoucherHistory {
  id: string
  voucher_id: string
  actor_id: string | null
  action: VoucherHistoryAction
  stage: VoucherStage
  previous_status: VoucherStatus | null
  new_status: VoucherStatus | null
  rejection_reason: string | null
  notes: string | null
  assigned_to_id: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface Payment {
  id: string
  voucher_id: string
  amount: number
  payment_reference: string
  paid_by: string
  paid_at: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Final payment officer configuration
// ---------------------------------------------------------------------------

export interface AppConfig {
  key: string
  value: string
  updated_at: string
  updated_by: string | null
}
