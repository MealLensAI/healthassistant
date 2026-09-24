import type { ChatMessage, Conversation, MissedCall } from '@/lib/care/types'

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

export function unreadNotificationCount(userId: string, notifications: { userId: string; read: boolean }[]) {
  return notifications.filter((item) => item.userId === userId && !item.read).length
}
