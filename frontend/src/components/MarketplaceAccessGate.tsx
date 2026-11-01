import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTrial } from '@/hooks/useTrial'
import { getPlanEntitlements } from '@/lib/planEntitlements'

/**
 * Blocks Bronze / free users from marketplace care routes.
 * Silver, Gold, and legacy paid plans pass through.
 * Dietitian-invite / enterprise routes are not wrapped by this gate.
 */
export default function MarketplaceAccessGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { hasActiveSubscription, subscriptionInfo, isLoading } = useTrial()

  if (isLoading) {
    return (
      <div className="hy-card p-10 text-center text-sm text-muted">
        Checking your plan…
      </div>
    )
  }

  const entitlements = getPlanEntitlements(subscriptionInfo?.planName, subscriptionInfo?.entitlements)
  const allowed =
    Boolean(subscriptionInfo?.marketplaceAccess) ||
    (hasActiveSubscription && entitlements.marketplace_access)

  if (!allowed) {
    const bronzeOnly = hasActiveSubscription && !entitlements.marketplace_access
    return (
      <Navigate
        to="/payment"
        replace
        state={{
          from: location.pathname,
          reason: 'marketplace_plan_required',
          message: bronzeOnly
            ? 'Bronze includes AI tools only. Upgrade to Silver or Gold to book a dietitian.'
            : 'Marketplace access requires a Silver or Gold plan.',
        }}
      />
    )
  }

  return <>{children}</>
}

export function MarketplaceLayout() {
  return (
    <MarketplaceAccessGate>
      <Outlet />
    </MarketplaceAccessGate>
  )
}
