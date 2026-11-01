import { Link } from 'react-router-dom'
import { usePlanUsage } from '@/hooks/usePlanUsage'

function UsageBar({
  label,
  used,
  total,
}: {
  label: string
  used: number
  total: number
}) {
  if (total <= 0) return null
  const safeUsed = Math.min(Math.max(used, 0), total)
  const left = Math.max(0, total - safeUsed)
  const percent = Math.round((safeUsed / total) * 100)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted">
          {safeUsed} of {total} used · {left} left
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={safeUsed}
        aria-label={`${label}: ${safeUsed} of ${total} used, ${left} left`}
      >
        <div className="h-full rounded-full bg-navy" style={{ width: `${Math.max(percent, safeUsed > 0 ? 8 : 0)}%` }} />
      </div>
    </div>
  )
}

export default function PlanUsageCard({ compact = false }: { compact?: boolean }) {
  const {
    planResolved,
    hasActiveSubscription,
    entitlements,
    usage,
    remaining,
    planLabel,
    formattedRemainingTime,
    visitsIncluded,
    visitsUsed,
    nextKind,
  } = usePlanUsage()

  if (!planResolved) return null

  if (compact) {
    const summary = entitlements.marketplace_access
      ? `${remaining.remainingTotal} of ${visitsIncluded} left`
      : 'AI tools only'
    return (
      <p className="text-[12px] leading-4 text-muted">
        <span className="font-semibold text-ink">{planLabel}</span>
        {' · '}
        {summary}
      </p>
    )
  }

  return (
    <section className="hy-card p-5" aria-label="Your plan">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Your plan</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal text-ink">{planLabel}</h2>
          {hasActiveSubscription && formattedRemainingTime ? (
            <p className="mt-1 text-sm text-muted">{formattedRemainingTime}</p>
          ) : null}
        </div>
        {entitlements.marketplace_access ? (
          <p className="rounded-full bg-navy-soft px-3 py-1 text-xs font-semibold text-navy">
            {remaining.remainingTotal} of {visitsIncluded} visits left
          </p>
        ) : null}
      </div>

      {entitlements.marketplace_access ? (
        <div className="mt-4 space-y-4">
          <UsageBar label="All visits" used={visitsUsed} total={visitsIncluded} />
          <UsageBar label="Consultation" used={usage.consultations} total={entitlements.consultations} />
          <UsageBar label="Follow-ups" used={usage.followUps} total={entitlements.follow_ups} />
          <p className="text-sm text-muted">
            {remaining.remainingTotal > 0
              ? `Next booking is a ${nextKind === 'follow_up' ? 'follow-up' : 'consultation'}.`
              : 'You have used the visits in this plan.'}
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm leading-6 text-muted">
            {planLabel === 'Bronze'
              ? 'Bronze is AI meal tools only. Silver or Gold adds a dietitian and appointments.'
              : 'Subscribe to Silver or Gold to book a dietitian.'}
          </p>
          <Link to="/payment" className="mt-3 inline-block text-sm font-semibold text-navy hover:underline">
            See plans
          </Link>
        </div>
      )}
    </section>
  )
}
