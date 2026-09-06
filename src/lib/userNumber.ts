/**
 * Bridges the product requirement of "User Number + Password" login onto
 * Supabase Auth, which is natively email/password based.
 *
 * Strategy: normalize the user's chosen User Number and deterministically
 * derive an internal-only synthetic email address
 * (e.g. "e1024@users.ag-voucher.internal"). The user never sees or enters
 * this email - it exists purely so Supabase Auth has something to store
 * against. The REAL identifier throughout the rest of the application is
 * the user_number column on `profiles`, which is enforced UNIQUE at the
 * database level.
 *
 * This keeps password handling entirely inside Supabase Auth (secure,
 * hashed, managed) instead of inventing a custom/home-grown password
 * system, while still satisfying the "no email required" UX requirement.
 */

const AUTH_EMAIL_DOMAIN =
  import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'users.ag-voucher.internal'

/** Normalize a user-entered user number for consistent storage/lookup. */
export function normalizeUserNumber(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '')
}

/** Derive the internal synthetic Supabase Auth email from a user number. */
export function userNumberToAuthEmail(userNumber: string): string {
  const normalized = normalizeUserNumber(userNumber)
  return `${normalized}@${AUTH_EMAIL_DOMAIN}`
}
