import type { ChatMessage, Conversation, MissedCall, User } from '@/lib/care/types'
import { practicePath } from '@/lib/care/practiceBase'

export function unreadInConversation(userId: string, conversation: Conversation, messages: ChatMessage[]) {
  const lastRead = conversation.lastReadAt?.[userId] ?? ''
  return messages.filter(
    (message) =>
      message.conversationId === conversation.id &&
      message.senderId !== userId &&
      message.timestamp > lastRead,
  ).length
}

export function unreadCountFor(userId: string, conversations: Conversation[], messages: ChatMessage[]) {
  return conversations
    .filter((conversation) => conversation.participantIds.includes(userId))
    .reduce((sum, conversation) => sum + unreadInConversation(userId, conversation, messages), 0)
}

export function unseenMissedCalls(userId: string, missedCalls: MissedCall[]) {
  return missedCalls.filter((item) => item.userId === userId && !item.seen)
}

export function notificationsFor<T extends { userId: string; createdAt: string }>(userId: string, notifications: T[]) {
  return [...notifications]
    .filter((item) => item.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/**
 * Rewrite stored notification hrefs so clicks land on the recipient's real shell.
 * Older rows mixed /messages, /dietitian/messages, and /enterprise/messages.
 */
export function resolveNotificationHref(
  href: string | undefined,
  opts: { role?: User['role'] | string | null; pathname?: string } = {},
): string | undefined {
  if (!href) return undefined
  const role = opts.role || 'patient'
  const pathname = opts.pathname || (typeof window !== 'undefined' ? window.location.pathname : '')

  const messageMatch = href.match(/\/messages\/([^/?#]+)/)
  if (messageMatch) {
    const id = messageMatch[1]
    if (role === 'dietitian') return practicePath(`messages/${id}`, pathname)
    if (role === 'admin') return `/admin`
    return `/messages/${id}`
  }

  if (/\/appointments(?:\/|$|\?)/.test(href) || href.endsWith('/appointments')) {
    if (role === 'dietitian') return practicePath('appointments', pathname)
    return '/appointments'
  }

  const applicationMatch = href.match(/\/admin\/applications\/([^/?#]+)/)
  if (applicationMatch) return `/admin/applications/${applicationMatch[1]}`

  if (href === '/dietitian' || href === '/dietitian/' || href === '/enterprise' || href === '/enterprise/') {
    if (role === 'dietitian') return practicePath('', pathname)
    return '/dietitians'
  }

  if (href.includes('/dietitian/apply') || href.endsWith('/apply')) {
    if (role === 'dietitian') return practicePath('apply', pathname)
    return href.startsWith('/') ? href : `/${href}`
  }

  // Patient should never open the practice shell from a bad stored link.
  if (role === 'patient' && (href.startsWith('/dietitian') || href.startsWith('/enterprise'))) {
    return '/messages'
  }

  return href
}

export function unreadNotificationCount(userId: string, notifications: { userId: string; read: boolean }[]) {
  return notifications.filter((item) => item.userId === userId && !item.read).length
}

export function pendingAppointmentCount(userId: string, appointments: import('./types').Appointment[], dietitians: { id: string; userId: string }[]) {
  const dietitianId = dietitians.find((item) => item.userId === userId)?.id
  return appointments.filter((item) => item.status === 'upcoming' && (item.patientId === userId || item.dietitianId === dietitianId)).length
}
