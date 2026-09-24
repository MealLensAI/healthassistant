import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '@/lib/care/context'
import { readHealthAppUser } from '@/lib/care/embeddedAuth'
import type { Role } from '@/lib/care/types'

export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { currentUser } = useApp()
  const location = useLocation()

  if (!currentUser) {
    // Prefer MealLensAI login when the host app session exists but care boot is mid-flight.
    const ha = typeof window !== 'undefined' ? readHealthAppUser() : null
    if (ha) {
      return (
        <div className="grid min-h-[40vh] place-items-center p-8 text-sm text-muted">
          Preparing your dietitian workspace…
        </div>
      )
    }
    // Care admin shell can boot without a MealLens session — wait instead of bouncing to /login.
    if (location.pathname.startsWith('/admin')) {
      return (
        <div className="grid min-h-[40vh] place-items-center p-8 text-sm text-muted">
          Opening verification queue…
        </div>
      )
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(currentUser.role)) {
    const home =
      currentUser.role === 'admin' ? '/admin' : currentUser.role === 'dietitian' ? '/dietitian' : '/food-for-you'
    return <Navigate to={home} replace />
  }

  return children
}
