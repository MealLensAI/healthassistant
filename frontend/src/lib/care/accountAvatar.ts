import type { Dietitian, DietitianApplication, User } from './types'

/** Older registrations saved the photo on the listing, not the account. */
export function accountAvatar(
  user: User | null | undefined,
  dietitians: Dietitian[],
  applications: DietitianApplication[] = [],
): string {
  if (!user) return ''
  if (user.avatar) return user.avatar
  if (user.role !== 'dietitian') return ''
  return dietitians.find((item) => item.userId === user.id)?.avatar
    || applications.find((item) => item.userId === user.id)?.documents.find((document) => document.kind === 'photo' && document.url)?.url
    || ''
}
