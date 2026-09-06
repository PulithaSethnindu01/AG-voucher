import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchOwnProfile, loginUser, logoutUser, registerUser } from '../services/authService'
import type { AuthResult, LoginInput, RegisterInput } from '../types/auth'
import type { ProfileWithRoles, RoleName } from '../types/database'

interface AuthContextValue {
  profile: ProfileWithRoles | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (input: LoginInput) => Promise<AuthResult>
  register: (input: RegisterInput) => Promise<AuthResult>
  logout: () => Promise<void>
  hasRole: (role: RoleName) => boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileWithRoles | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    const p = await fetchOwnProfile()
    setProfile(p)
    return p
  }, [])

  useEffect(() => {
    let mounted = true

    // Restore session on initial load / refresh.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (session) {
        await loadProfile()
      }
      setIsLoading(false)
    })

    // React to auth state changes (login, logout, token refresh) so the
    // app stays in sync across tabs and after token refresh.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (session) {
        await loadProfile()
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const login = useCallback(
    async (input: LoginInput): Promise<AuthResult> => {
      setError(null)
      const result = await loginUser(input)
      if (result.success) {
        await loadProfile()
      } else {
        setError(result.error ?? 'Login failed.')
      }
      return result
    },
    [loadProfile],
  )

  const register = useCallback(async (input: RegisterInput): Promise<AuthResult> => {
    setError(null)
    const result = await registerUser(input)
    if (!result.success) {
      setError(result.error ?? 'Registration failed.')
    }
    return result
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
    setProfile(null)
  }, [])

  const hasRole = useCallback(
    (role: RoleName) => profile?.roles.includes(role) ?? false,
    [profile],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      isAuthenticated: profile !== null,
      isLoading,
      error,
      login,
      register,
      logout,
      hasRole,
      refreshProfile: async () => {
        await loadProfile()
      },
    }),
    [profile, isLoading, error, login, register, logout, hasRole, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
