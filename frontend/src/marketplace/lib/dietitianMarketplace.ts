import type { Dietitian } from '../types'

export function dietitianListingForUser(dietitians: Dietitian[], userId: string) {
  return dietitians.find((item) => item.userId === userId)
}

/** Dietitians may set availability and submit credentials until admin approves them. */
export function isDietitianMarketplaceApproved(dietitians: Dietitian[], userId: string) {
  const listing = dietitianListingForUser(dietitians, userId)
  return listing?.status === 'approved'
}

export function dietitianMarketplaceStatus(dietitians: Dietitian[], userId: string) {
  return dietitianListingForUser(dietitians, userId)?.status ?? 'pending'
}
