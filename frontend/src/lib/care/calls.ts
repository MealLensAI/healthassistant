import type { Dietitian, DietitianApplication, LiveCall, User, VideoCallState } from '@/lib/care/types'
import { accountAvatar } from '@/lib/care/accountAvatar'
import { uuidv5 } from '@/lib/care/uuid'

/** Calls share the same account/listing photo source as the profile and app header. */
export function withCallPeerAvatar(
  call: VideoCallState | null,
  users: User[],
  dietitians: Dietitian[],
  applications: DietitianApplication[] = [],
): VideoCallState | null {
  if (!call) return null
  const peer = users.find((user) => user.id === call.peerId)
  const avatar = accountAvatar(peer, dietitians, applications)
  return avatar ? { ...call, peerAvatar: avatar } : call
}

export function activeCallFromLive(
  userId: string | undefined,
  liveCalls: LiveCall[] | undefined,
  previous?: VideoCallState | null,
): VideoCallState | null {
  if (!userId) return null
  const mine = (liveCalls ?? []).find((item) => item.callerId === userId || item.calleeId === userId)
  if (!mine) return null
  // Never demote a locally answered/live call back to ringing from a stale pulse.
  const status =
    previous?.callId === mine.id && previous.status === 'live' && mine.status === 'ringing'
      ? 'live'
      : mine.status
  const incoming = mine.calleeId === userId && status === 'ringing'
  const peerIsCaller = mine.calleeId === userId
  const peerId = peerIsCaller ? mine.callerId : mine.calleeId
  const previousPeer = previous?.callId === mine.id && previous.peerId === peerId ? previous : null
  const peerName = peerIsCaller ? mine.callerName : mine.calleeName
  const peerAvatar = peerIsCaller ? mine.callerAvatar : mine.calleeAvatar
  return {
    conversationId: mine.conversationId,
    peerId,
    peerName: peerName || previousPeer?.peerName || 'Care',
    peerAvatar: peerAvatar || previousPeer?.peerAvatar || '',
    status,
    incoming,
    callId: mine.id,
  }
}

/** Stable conversation PK — must match backend `conversation_id_for` (UUID v5). */
export function conversationIdFor(userA: string, userB: string) {
  const members = [userA, userB].sort().join(':')
  return uuidv5(`meallens-care:${members}`)
}
