import type { Dietitian, Role, User } from '@/lib/care/types'
import { practiceBase, practicePath } from '@/lib/care/practiceBase'

export function ownProfilePath(role: Role, pathname?: string) {
  if (role === 'patient') return '/profile'
  if (role === 'dietitian') return practicePath('profile', pathname)
  return '/admin/settings'
}

export function dietitianProfilePath(dietitianId: string, viewerRole: Role, pathname?: string) {
  if (viewerRole === 'dietitian') return practicePath(`dietitians/${dietitianId}`, pathname)
  if (viewerRole === 'admin') return `/admin/public/${dietitianId}`
  return `/dietitians/${dietitianId}`
}

export function patientChartPath(patientId: string, viewerRole: Role, pathname?: string) {
  if (viewerRole === 'admin') return `/admin/patients/${patientId}`
  return practicePath(`patients/${patientId}`, pathname)
}

export function patientProfilePath(userId: string, viewerRole: Role, currentUserId?: string, pathname?: string) {
  if (viewerRole === 'patient' || currentUserId === userId) return '/profile'
  return patientChartPath(userId, viewerRole, pathname)
}

export function peerProfilePath({
  currentUser,
  peerUserId,
  dietitians,
  users = [],
  pathname,
}: {
  currentUser: User
  peerUserId?: string
  dietitians: Dietitian[]
  users?: User[]
  pathname?: string
}) {
  if (!peerUserId) return ownProfilePath(currentUser.role, pathname)
  if (peerUserId === currentUser.id) return ownProfilePath(currentUser.role, pathname)

  const user = users.find((item) => item.id === peerUserId)
  if (user?.role === 'patient') {
    if (currentUser.role === 'patient') return '/profile'
    return patientChartPath(peerUserId, currentUser.role, pathname)
  }

  const listing = dietitians.find((item) => item.userId === peerUserId || item.id === peerUserId)
  if (listing) return dietitianProfilePath(listing.id, currentUser.role, pathname)

  if (currentUser.role === 'dietitian' || currentUser.role === 'admin') {
    return patientChartPath(peerUserId, currentUser.role, pathname)
  }

  return ownProfilePath(currentUser.role, pathname)
}

export { practiceBase, practicePath }
