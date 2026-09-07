import { supabase } from '../lib/supabaseClient'
import type {
  VoucherWithDetails,
  VoucherType,
  VoucherHistory,
} from '../types/database'

/**
 * Voucher service layer. Interacts with Supabase tables and RPCs.
 */

export async function fetchVouchers() {
  const { data, error } = await supabase
    .from('vouchers_with_details')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as VoucherWithDetails[]
}

export async function fetchVoucherById(id: string) {
  const { data, error } = await supabase
    .from('vouchers_with_details')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as VoucherWithDetails | null
}

export async function fetchVoucherHistory(voucherId: string) {
  const { data, error } = await supabase
    .from('voucher_history')
    .select(`
      *,
      actor:profiles!actor_id(name, user_number),
      assigned_to:profiles!assigned_to_id(name, user_number)
    `)
    .eq('voucher_id', voucherId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as (VoucherHistory & {
    actor: { name: string; user_number: string } | null
    assigned_to: { name: string; user_number: string } | null
  })[]
}

export async function fetchVoucherTypes() {
  const { data, error } = await supabase
    .from('voucher_types')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data as VoucherType[]
}

/**
 * Fetches active users eligible for a specific workflow stage.
 */
export async function fetchActiveApprovers(role: string = 'SECOND_APPROVER') {
  const { data, error } = await supabase
    .rpc('get_profiles_by_role', { role_name: role })

  if (error) throw error
  return data as { id: string; name: string; user_number: string }[]
}

/**
 * Searches for active users for requester selection.
 */
export async function searchProfiles(query: string) {
  const { data, error } = await supabase
    .rpc('search_profiles', { p_query: query })

  if (error) throw error
  return data as { id: string; name: string; user_number: string }[]
}

// Workflow RPC wrappers
export async function createVoucher(input: {
  voucherNumber: string
  requesterId: string
  voucherTypeId: string
  description: string
  voucherMonth: number
  voucherYear: number
}) {
  const { data, error } = await supabase.rpc('create_voucher', {
    p_voucher_number: input.voucherNumber,
    p_requester_id: input.requesterId,
    p_voucher_type_id: input.voucherTypeId,
    p_description: input.description,
    p_voucher_month: input.voucherMonth,
    p_voucher_year: input.voucherYear,
  })

  if (error) {
    // Handle unique constraint violation for voucher_number (Postgres code 23505)
    if (error.code === '23505') {
      throw new Error(`The voucher number "${input.voucherNumber}" is already in use. Please use a unique number.`)
    }
    throw error
  }

  return data as string
}

/**
 * Flexible Approval: Forward to another officer.
 */
export async function approveAndForward(voucherId: string, nextApproverId: string) {
  const { error } = await supabase.rpc('approve_and_forward', {
    p_voucher_id: voucherId,
    p_next_approver_id: nextApproverId,
  })
  if (error) throw error
}

/**
 * Flexible Approval: Send to Final Payment stage with a selected officer.
 */
export async function approveToPayment(voucherId: string, paymentOfficerId: string) {
  const { error } = await supabase.rpc('approve_to_payment', {
    p_voucher_id: voucherId,
    p_payment_officer_id: paymentOfficerId,
  })
  if (error) throw error
}

export async function rejectVoucher(voucherId: string, reason: string) {
  const { error } = await supabase.rpc('reject_voucher', {
    p_voucher_id: voucherId,
    p_rejection_reason: reason,
  })
  if (error) throw error
}

export async function resubmitVoucher(voucherId: string) {
  const { error } = await supabase.rpc('resubmit_voucher', {
    p_voucher_id: voucherId,
  })
  if (error) throw error
}

export async function markPaid(voucherId: string, amount: number, reference: string) {
  const { error } = await supabase.rpc('mark_voucher_paid', {
    p_voucher_id: voucherId,
    p_amount: amount,
    p_payment_reference: reference,
  })
  if (error) throw error
}
