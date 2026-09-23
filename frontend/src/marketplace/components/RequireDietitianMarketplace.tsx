import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../context'
import { isDietitianMarketplaceApproved } from '../lib/dietitianMarketplace'
import { careRoutes } from '../lib/paths'

export function RequireDietitianMarketplace({ children }: { children: ReactNode }) {
  const { currentUser, dietitians } = useApp()
  const location = useLocation()

  if (!currentUser || currentUser.role !== 'dietitian') {
    return <>{children}</>
  }

  if (isDietitianMarketplaceApproved(dietitians, currentUser.id)) {
    return <>{children}</>
  }

  return (
    <Navigate
      to={careRoutes.dietitianApply}
      replace
      state={{ from: location.pathname, reason: 'marketplace_locked' }}
    />
  )
}
