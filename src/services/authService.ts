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
    return 'වැරදි සේවා අංකයක් හෝ මුරපදයකි.'
  }
  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return 'එම සේවා අංකය දැනටමත් ලියාපදිංචි කර ඇත.'
  }
  if (lower.includes('rate limit')) {
    return 'උත්සාහයන් වැඩියි. කරුණාකර මොහොතක් රැඳී සිට නැවත උත්සාහ කරන්න.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'කරුණාකර ඔබගේ සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න.'
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
        error: 'ලියාපදිංචිය සම්පූර්ණ කළ නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.',
      }
    }

    // Create the corresponding profile row.
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.id,
      user_number: userNumber,
      name: input.name.trim(),
      mobile_number: input.mobileNumber.trim(),
    })

    if (profileError) {
      if (profileError.code === '23505') {
        return { success: false, error: 'එම සේවා අංකය දැනටමත් ලියාපදිංචි කර ඇත.' }
      }
      return { success: false, error: 'ලියාපදිංචිය සම්පූර්ණ කළ නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.' }
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

    const profile = await fetchOwnProfile()
    if (!profile) {
      await supabase.auth.signOut()
      return { success: false, error: 'ගිණුම හමු නොවීය. කරුණාකර පරිපාලකවරයෙකු අමතන්න.' }
    }
    if (!profile.is_active) {
      await supabase.auth.signOut()
      return { success: false, error: 'මෙම ගිණුම අක්‍රිය කර ඇත. කරුණාකර පරිපාලකවරයෙකු අමතන්න.' }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: friendlyAuthError(err instanceof Error ? err.message : '') }
  }
}

/**
 * Resets a user's password by verifying their user number and mobile number.
 */
export async function resetPasswordSelfService(input: {
  userNumber: string
  mobileNumber: string
  newPassword: string
}): Promise<AuthResult> {
  try {
    const { error } = await supabase.rpc('reset_password_self_service', {
      p_user_number: normalizeUserNumber(input.userNumber),
      p_mobile_number: input.mobileNumber.trim(),
      p_new_password: input.newPassword
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: 'මුරපදය නැවත සැකසීමට අසමත් විය. කරුණාකර ඔබගේ දත්ත පරීක්ෂා කරන්න.' }
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
