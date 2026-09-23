import type { LiveCall, VideoCallState } from '../types'

export function activeCallFromLive(userId: string | undefined, liveCalls: LiveCall[] | undefined): VideoCallState | null {
  if (!userId) return null
  const mine = (liveCalls ?? []).find((item) => item.callerId === userId || item.calleeId === userId)
  if (!mine) return null
  const incoming = mine.calleeId === userId && mine.status === 'ringing'
  const peerIsCaller = mine.calleeId === userId
  return {
    conversationId: mine.conversationId,
    peerId: peerIsCaller ? mine.callerId : mine.calleeId,
    peerName: peerIsCaller ? mine.callerName : mine.calleeName,
    peerAvatar: peerIsCaller ? mine.callerAvatar : mine.calleeAvatar,
    status: mine.status,
    incoming,
    callId: mine.id,
  }
}

export function conversationIdFor(userA: string, userB: string) {
  return `conv-${[userA, userB].sort().join('-')}`
}
