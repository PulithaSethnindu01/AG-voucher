import { supabase } from '../lib/supabaseClient'
import type { ProfileWithRoles, RoleName, AppConfig } from '../types/database'

/**
 * Administrative service layer. Requires ADMIN role at database level.
 */

export async function fetchAllProfiles() {
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .order('name')

  if (pError) throw pError

  const { data: roles, error: rError } = await supabase
    .from('profile_roles')
    .select('profile_id, roles(name)')

  if (rError) throw rError

  return profiles.map((p) => ({
    ...p,
    roles: roles
      .filter((r) => r.profile_id === p.id)
      .map((r) => {
        const rel = r.roles as unknown as { name: RoleName } | { name: RoleName }[] | null
        if (!rel) return null
        return Array.isArray(rel) ? rel[0]?.name ?? null : rel.name
      })
      .filter((r): r is RoleName => Boolean(r)),
  })) as ProfileWithRoles[]
}

export async function updateUserRole(profileId: string, role: RoleName, action: 'ADD' | 'REMOVE') {
  const { error } = await supabase.rpc('update_user_role', {
    p_profile_id: profileId,
    p_role_name: role,
    p_action: action,
  })
  if (error) throw error
}

export async function toggleUserStatus(profileId: string, isActive: boolean) {
  const { error } = await supabase.rpc('toggle_user_status', {
    p_profile_id: profileId,
    p_is_active: isActive,
  })
  if (error) throw error
}

export async function fetchAppConfig() {
  const { data, error } = await supabase
    .from('app_config')
    .select('*')

  if (error) throw error
  return data as AppConfig[]
}

export async function setAppConfig(key: string, value: string) {
  const { error } = await supabase.rpc('set_app_config', {
    p_key: key,
    p_value: value,
  })
  if (error) throw error
}
