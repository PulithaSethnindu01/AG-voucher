import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { RoleName } from '../types/database'
import { FullPageSpinner } from './ui/Spinner'

interface ProtectedRouteProps {
  children: ReactNode
  /** If provided, at least one of these roles is required to access the route. */
  requireAnyRole?: RoleName[]
}

export function ProtectedRoute({ children, requireAnyRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, profile } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <FullPageSpinner label="Checking session…" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireAnyRole && requireAnyRole.length > 0) {
    const allowed = requireAnyRole.some((r) => profile?.roles.includes(r))
    if (!allowed) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <FullPageSpinner />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
