import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useTrial } from '@/hooks/useTrial'
import { hasMarketplaceAccess, marketplaceUpgradeCopy } from '@/lib/planEntitlements'
import MarketplaceUpgradeModal from '@/components/MarketplaceUpgradeModal'
import { Button } from '@/components/ui/button'

/**
 * Marketplace care routes stay clickable for Bronze / free users.
 * They see an upgrade modal instead of a silent bounce to /payment.
 * Dietitian-invite / enterprise routes are not wrapped by this gate.
 */
export default function MarketplaceAccessGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasActiveSubscription, subscriptionInfo, isLoading, planResolved } = useTrial()
  const [modalOpen, setModalOpen] = useState(true)

  useEffect(() => {
    setModalOpen(true)
  }, [location.pathname])

  if (isLoading || !planResolved) {
    return (
      <div className="hy-card p-10 text-center text-sm text-muted">
        Checking your plan…
      </div>
    )
  }

  if (hasMarketplaceAccess(subscriptionInfo, hasActiveSubscription)) {
    return <>{children}</>
  }

  const copy = marketplaceUpgradeCopy(
    subscriptionInfo?.planName,
    subscriptionInfo?.entitlements,
    hasActiveSubscription,
  )

  return (
    <>
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-navy-soft text-navy">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-ink">{copy.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{copy.message}</p>
        <Button
          type="button"
          className="mt-6 bg-navy text-white hover:bg-navy/90"
          onClick={() =>
            navigate('/payment', {
              state: {
                from: location.pathname,
                reason: 'marketplace_plan_required',
                message: copy.message,
              },
            })
          }
        >
          Upgrade to Silver or Gold
        </Button>
      </div>
      <MarketplaceUpgradeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={copy.title}
        message={copy.message}
        fromPath={location.pathname}
      />
    </>
  )
}

export function MarketplaceLayout() {
  return (
    <MarketplaceAccessGate>
      <Outlet />
    </MarketplaceAccessGate>
  )
}
