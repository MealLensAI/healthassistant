import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../context'
import type { Role } from '../types'

export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { currentUser } = useApp()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(currentUser.role)) {
    const home = currentUser.role === 'admin' ? '/admin' : currentUser.role === 'dietitian' ? '/dietitian' : '/'
    return <Navigate to={home} replace />
  }

  return children
}
