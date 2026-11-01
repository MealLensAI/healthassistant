import type { Appointment } from '@/lib/care/types'

export type PlanTier = 'free' | 'bronze' | 'silver' | 'gold' | 'open'

export type PlanEntitlements = {
  tier: PlanTier
  marketplace_access: boolean
  max_dietitians: number
  consultations: number
  follow_ups: number
}

export const FREE_ENTITLEMENTS: PlanEntitlements = {
  tier: 'free',
  marketplace_access: false,
  max_dietitians: 0,
  consultations: 0,
  follow_ups: 0,
}

export const BRONZE_ENTITLEMENTS: PlanEntitlements = {
  tier: 'bronze',
  marketplace_access: false,
  max_dietitians: 0,
  consultations: 0,
  follow_ups: 0,
}

export const SILVER_ENTITLEMENTS: PlanEntitlements = {
  tier: 'silver',
  marketplace_access: true,
  max_dietitians: 1,
  consultations: 1,
  follow_ups: 2,
}

export const GOLD_ENTITLEMENTS: PlanEntitlements = {
  tier: 'gold',
  marketplace_access: true,
  max_dietitians: 1,
  consultations: 1,
  follow_ups: 6,
}

const BY_TIER: Record<Exclude<PlanTier, 'open'>, PlanEntitlements> = {
  free: FREE_ENTITLEMENTS,
  bronze: BRONZE_ENTITLEMENTS,
  silver: SILVER_ENTITLEMENTS,
  gold: GOLD_ENTITLEMENTS,
}

export function normalizePlanName(planName?: string | null): Exclude<PlanTier, 'open'> {
  const raw = (planName || '').trim().toLowerCase()
  if (!raw || raw === 'unknown' || raw === 'none' || raw === 'plan') return 'free'
  if (raw.includes('gold')) return 'gold'
  if (raw.includes('bronze') || raw.includes('$10')) return 'bronze'
  if (raw.includes('silver')) return 'silver'
  if (['six_month', 'six month', '$120', 'yearly', '1 year', '$240'].some((token) => raw.includes(token))) {
    return 'gold'
  }
  if (['monthly', '1 month', '$20'].some((token) => raw.includes(token))) return 'silver'
  return 'free'
}

export function getPlanEntitlements(planName?: string | null, fromStatus?: Partial<PlanEntitlements> | null): PlanEntitlements {
  if (fromStatus && typeof fromStatus.marketplace_access === 'boolean') {
    let tier = (fromStatus.tier as PlanTier) || normalizePlanName(planName)
    if (fromStatus.marketplace_access && (tier === 'free' || !tier)) tier = 'silver'
    const base = BY_TIER[tier === 'open' ? 'gold' : tier] || SILVER_ENTITLEMENTS
    return {
      ...base,
      ...fromStatus,
      tier: tier === 'open' ? 'gold' : tier,
    }
  }
  return { ...BY_TIER[normalizePlanName(planName)] }
}

export function inferVisitKind(topic?: string | null, stored?: string | null): 'consultation' | 'follow_up' {
  if (stored === 'consultation' || stored === 'follow_up') return stored
  const text = (topic || '').trim().toLowerCase()
  if (text.startsWith('follow-up') || text.startsWith('follow up') || text.includes('follow-up')) return 'follow_up'
  return 'consultation'
}

export function appointmentUsage(appointments: Appointment[], patientId: string) {
  const countable = appointments.filter(
    (item) => item.patientId === patientId && (item.status === 'upcoming' || item.status === 'completed'),
  )
  let consultations = 0
  let followUps = 0
  const dietitianIds: string[] = []
  const seen = new Set<string>()
  for (const item of countable) {
    const kind = inferVisitKind(item.topic, item.visitKind)
    if (kind === 'follow_up') followUps += 1
    else consultations += 1
    if (item.dietitianId && !seen.has(item.dietitianId)) {
      seen.add(item.dietitianId)
      dietitianIds.push(item.dietitianId)
    }
  }
  return {
    consultations,
    followUps,
    dietitianIds,
    nextKind: (consultations === 0 ? 'consultation' : 'follow_up') as 'consultation' | 'follow_up',
  }
}

export function remainingAppointments(entitlements: PlanEntitlements, usage: ReturnType<typeof appointmentUsage>) {
  const remainingConsults = entitlements.consultations < 0 ? Infinity : Math.max(0, entitlements.consultations - usage.consultations)
  const remainingFollowUps = entitlements.follow_ups < 0 ? Infinity : Math.max(0, entitlements.follow_ups - usage.followUps)
  return {
    remainingConsults,
    remainingFollowUps,
    remainingTotal: remainingConsults + remainingFollowUps,
  }
}
