import type { ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTrial } from '@/hooks/useTrial'
import { hasMarketplaceAccess, marketplaceUpgradeCopy } from '@/lib/planEntitlements'

/**
 * Marketplace care routes stay reachable for Bronze / free users.
 * They see an in-page upgrade prompt instead of a silent bounce to /payment.
 * Dietitian-invite / enterprise routes are not wrapped by this gate.
 */
export default function MarketplaceAccessGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasActiveSubscription, subscriptionInfo, isLoading, planResolved } = useTrial()

  if (isLoading || !planResolved) {
    return (
      <div className="px-6 py-16 text-center text-sm text-[#546478] dark:text-[#c5d0de]">
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
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-[#d7d2c8] bg-[#fcfaf8] p-6 text-left shadow-sm dark:border-[#3a465c] dark:bg-[#1b2433]">
        <h1 className="text-xl font-semibold leading-7 tracking-normal text-[#092649] dark:text-[#eef3f8]">
          {copy.title}
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-[#546478] dark:text-[#c5d0de]">{copy.message}</p>
        <p className="mt-4 text-sm leading-6 text-[#092649] dark:text-[#eef3f8]">
          Silver is $20 / month. Gold is $50 for 3 months.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0e3e77] px-4 text-[15px] font-semibold text-white hover:bg-[#082a54] dark:bg-[#d7e6f8] dark:text-[#0a1a30] dark:hover:bg-white"
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
          See plans
        </button>
      </div>
    </div>
  )
}

export function MarketplaceLayout() {
  return (
    <MarketplaceAccessGate>
      <Outlet />
    </MarketplaceAccessGate>
  )
}
