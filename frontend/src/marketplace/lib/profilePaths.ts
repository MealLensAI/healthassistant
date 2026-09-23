import type { Dietitian, Role, User } from '../types'

export function ownProfilePath(role: Role) {
  if (role === 'patient') return '/profile'
  if (role === 'dietitian') return '/dietitian/profile'
  return '/admin/settings'
}

export function dietitianProfilePath(dietitianId: string, viewerRole: Role) {
  if (viewerRole === 'dietitian') return `/dietitian/dietitians/${dietitianId}`
  if (viewerRole === 'admin') return `/admin/public/${dietitianId}`
  return `/dietitians/${dietitianId}`
}

export function patientChartPath(patientId: string, viewerRole: Role) {
  if (viewerRole === 'admin') return `/admin/patients/${patientId}`
  return `/dietitian/patients/${patientId}`
}

export function patientProfilePath(userId: string, viewerRole: Role, currentUserId?: string) {
  if (viewerRole === 'patient' || currentUserId === userId) return '/profile'
  return patientChartPath(userId, viewerRole)
}

export function peerProfilePath({
  currentUser,
  peerUserId,
  dietitians,
  users = [],
}: {
  currentUser: User
  peerUserId?: string
  dietitians: Dietitian[]
  users?: User[]
}) {
  if (!peerUserId) return ownProfilePath(currentUser.role)
  if (peerUserId === currentUser.id) return ownProfilePath(currentUser.role)

  const user = users.find((item) => item.id === peerUserId)
  if (user?.role === 'patient') {
    if (currentUser.role === 'patient') return '/profile'
    return patientChartPath(peerUserId, currentUser.role)
  }

  const listing = dietitians.find((item) => item.userId === peerUserId || item.id === peerUserId)
  if (listing) return dietitianProfilePath(listing.id, currentUser.role)

  if (currentUser.role === 'dietitian' || currentUser.role === 'admin') {
    return patientChartPath(peerUserId, currentUser.role)
  }

  return ownProfilePath(currentUser.role)
}
