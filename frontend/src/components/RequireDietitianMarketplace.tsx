import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '@/lib/care/context'
import { isDietitianMarketplaceApproved } from '@/lib/care/dietitianMarketplace'
import { isEnterprisePractice, practicePath } from '@/lib/care/practiceBase'
import { careRoutes } from '@/lib/care/paths'

export function RequireDietitianMarketplace({ children }: { children: ReactNode }) {
  const { currentUser, dietitians } = useApp()
  const location = useLocation()

  if (!currentUser || currentUser.role !== 'dietitian') {
    return <>{children}</>
  }

  // Enterprise org practice stays usable before marketplace approval (registration tab lives here).
  if (isEnterprisePractice(location.pathname)) {
    return <>{children}</>
  }

  if (isDietitianMarketplaceApproved(dietitians, currentUser.id)) {
    return <>{children}</>
  }

  return (
    <Navigate
      to={practicePath('apply', location.pathname) || careRoutes.dietitianApply}
      replace
      state={{ from: location.pathname, reason: 'marketplace_locked' }}
    />
  )
}
