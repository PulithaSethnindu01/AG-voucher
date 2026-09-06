import { supabase } from '../lib/supabaseClient'
import { normalizeUserNumber, userNumberToAuthEmail } from '../lib/userNumber'
import type { AuthResult, LoginInput, RegisterInput } from '../types/auth'
import type { ProfileWithRoles, RoleName } from '../types/database'

/**
 * Auth + profile service layer. All Supabase Auth / DB access for
 * authentication concerns is centralized here, kept separate from React
 * components/hooks so UI stays presentation-only.
 */

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'Incorrect user number or password.'
  }
  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return 'That user number is already registered.'
  }
  if (lower.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }
  return 'Something went wrong. Please try again.'
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  try {
    const userNumber = normalizeUserNumber(input.userNumber)
    const email = userNumberToAuthEmail(userNumber)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          user_number: userNumber,
          name: input.name.trim(),
        },
      },
    })

    if (signUpError) {
      return { success: false, error: friendlyAuthError(signUpError.message) }
    }

    const authUser = signUpData.user
    if (!authUser) {
      return {
        success: false,
        error: 'Registration could not be completed. Please try again.',
      }
    }

    // Create the corresponding profile row. The database also enforces
    // uniqueness of user_number and defaults the EMPLOYEE role via a
    // trigger/RPC (see migrations) - this call is defense-in-depth /
    // primary creation path guarded by RLS (a user may only insert their
    // own profile row).
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.id,
      user_number: userNumber,
      name: input.name.trim(),
      mobile_number: input.mobileNumber.trim(),
    })

    if (profileError) {
      if (profileError.code === '23505') {
        return { success: false, error: 'That user number is already registered.' }
      }
      return { success: false, error: 'Registration could not be completed. Please try again.' }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: friendlyAuthError(err instanceof Error ? err.message : '') }
  }
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  try {
    const userNumber = normalizeUserNumber(input.userNumber)
    const email = userNumberToAuthEmail(userNumber)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password,
    })

    if (error) {
      return { success: false, error: friendlyAuthError(error.message) }
    }

    // Confirm the profile is active. If disabled, sign the user back out
    // immediately - RLS also blocks disabled users from doing anything
    // meaningful, but we want a clear, immediate error at login time.
    const profile = await fetchOwnProfile()
    if (!profile) {
      await supabase.auth.signOut()
      return { success: false, error: 'Account not found. Please contact an administrator.' }
    }
    if (!profile.is_active) {
      await supabase.auth.signOut()
      return { success: false, error: 'This account has been disabled. Please contact an administrator.' }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: friendlyAuthError(err instanceof Error ? err.message : '') }
  }
}

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut()
}

/** Fetch the currently authenticated user's own profile row (RLS-scoped). */
export async function fetchOwnProfile(): Promise<ProfileWithRoles | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profileData) return null

  const { data: roleRows } = await supabase
    .from('profile_roles')
    .select('roles(name)')
    .eq('profile_id', user.id)

  const roles: RoleName[] = (roleRows ?? [])
    .map((r) => {
      const rel = r as unknown as { roles: { name: RoleName } | { name: RoleName }[] | null }
      if (!rel.roles) return null
      return Array.isArray(rel.roles) ? rel.roles[0]?.name ?? null : rel.roles.name
    })
    .filter((r): r is RoleName => Boolean(r))

  return {
    id: profileData.id,
    user_number: profileData.user_number,
    name: profileData.name,
    mobile_number: profileData.mobile_number,
    is_active: profileData.is_active,
    created_at: profileData.created_at,
    updated_at: profileData.updated_at,
    roles,
  }
}
