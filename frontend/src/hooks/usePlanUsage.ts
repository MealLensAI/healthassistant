import { useApp } from '@/lib/care/context'
import { useTrial } from '@/hooks/useTrial'
import {
  appointmentUsage,
  getPlanEntitlements,
  remainingAppointments,
  type PlanEntitlements,
  type PlanTier,
} from '@/lib/planEntitlements'

const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Free',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  open: 'Care',
}

export function planDisplayName(tier: PlanTier) {
  return PLAN_LABELS[tier] || 'Free'
}

export function usePlanUsage() {
  const { hasActiveSubscription, subscriptionInfo, formattedRemainingTime, planResolved } = useTrial()
  const { currentUser, appointments } = useApp()
  const entitlements: PlanEntitlements = getPlanEntitlements(
    subscriptionInfo?.planName,
    subscriptionInfo?.entitlements,
  )
  const usage = currentUser
    ? appointmentUsage(appointments, currentUser.id)
    : { consultations: 0, followUps: 0, dietitianIds: [], nextKind: 'consultation' as const }
  const reservedUpcoming = currentUser
    ? appointments.filter((item) => item.patientId === currentUser.id && item.status === 'upcoming').length
    : 0
  const remaining = remainingAppointments(entitlements, usage)
  const remainingToBook = Math.max(0, remaining.remainingTotal - reservedUpcoming)
  const nextKind: 'consultation' | 'follow_up' =
    usage.consultations === 0 && reservedUpcoming === 0 ? 'consultation' : 'follow_up'
  const tier = hasActiveSubscription ? entitlements.tier : entitlements.tier === 'bronze' ? 'bronze' : 'free'
  const planLabel = planDisplayName(tier === 'open' ? 'gold' : tier)
  const visitsIncluded = Math.max(0, entitlements.consultations) + Math.max(0, entitlements.follow_ups)
  const visitsUsed = usage.consultations + usage.followUps

  return {
    planResolved,
    hasActiveSubscription,
    entitlements,
    usage,
    remaining,
    planLabel,
    tier,
    formattedRemainingTime,
    visitsIncluded,
    visitsUsed,
    nextKind,
    canBook: entitlements.marketplace_access && remainingToBook > 0,
  }
}
