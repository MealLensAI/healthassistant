import { describe, expect, it } from 'vitest'
import { mergeCarePulse } from './api'
import { activeCallFromLive } from './calls'
import { CallRequestGuard, reconcileCallState } from './callLifecycle'
import { appReducer, createInitialState } from './store'
import type { LiveCall, User } from './types'

const patient: User = { id: 'patient', name: 'Pat', email: 'pat@test.invalid', role: 'patient', avatar: '' }
const dietitian: User = { id: 'dietitian', name: 'Doc', email: 'doc@test.invalid', role: 'dietitian', avatar: '' }
const live: LiveCall = {
  id: 'call-old', conversationId: 'conversation', callerId: dietitian.id, calleeId: patient.id,
  callerName: dietitian.name, calleeName: patient.name, callerAvatar: '', calleeAvatar: '',
  status: 'live', startedAt: '2026-09-28T00:00:00Z',
}
const emptyPulse = { users: [], conversations: [], notifications: [], missedCalls: [], appointments: [], liveCalls: [] }

function duringCall(user = patient, call = live) {
  return createInitialState({
    currentUser: user, liveCalls: [call], activeCall: activeCallFromLive(user.id, [call]),
  })
}

describe('call lifecycle synchronization', () => {
  it.each(['START_CALL', 'ANSWER_CALL'])('rejects old empty reads after %s acknowledgement', () => {
    const guard = new CallRequestGuard()
    const bootstrapRequest = guard.capture()
    guard.changed()
    const mutationRequest = guard.capture()
    // The DB still has the old snapshot while the write is in flight.
    const pendingPulseRequest = guard.capture()
    expect(guard.acknowledged(mutationRequest)).toBe(true)
    const current = duringCall()
    for (const requestedVersion of [bootstrapRequest, pendingPulseRequest]) {
      const protectedPulse = guard.protect(emptyPulse, current.liveCalls, requestedVersion)
      const next = reconcileCallState(current, mergeCarePulse(current, protectedPulse), new Set(), new Set())
      expect(next.activeCall?.callId).toBe(live.id)
      const protectedBootstrap = guard.protect({ ...current, liveCalls: [] }, current.liveCalls, requestedVersion)
      expect(protectedBootstrap.liveCalls).toEqual([live])
    }
    // Fresh reads after the commit must still honor a later remote hangup.
    expect(mergeCarePulse(current, guard.protect(emptyPulse, current.liveCalls, guard.capture())).activeCall).toBeNull()
  })

  it('does not accept a delayed start acknowledgement after a local hangup', () => {
    const guard = new CallRequestGuard()
    guard.changed()
    const startRequest = guard.capture()
    guard.changed()
    expect(guard.acknowledged(startRequest)).toBe(false)
  })

  it.each([patient, dietitian])('ends $role call when the server removes it', (user: User) => {
    const next = mergeCarePulse(duringCall(user), emptyPulse)
    expect(next.activeCall).toBeNull()
    expect(next.liveCalls).toEqual([])
  })

  it('protects only a start still awaiting acknowledgement from an empty pulse', () => {
    const current = duringCall()
    const empty = mergeCarePulse(current, emptyPulse)
    const pending = reconcileCallState(current, empty, new Set(), new Set([live.id]))
    expect(pending.activeCall?.callId).toBe(live.id)
    const acknowledged = reconcileCallState(current, empty, new Set(), new Set())
    expect(acknowledged.activeCall).toBeNull()
  })

  it('does not revive an ended call from a late response, even during a pending start', () => {
    const current = createInitialState({ currentUser: patient })
    const next = reconcileCallState(current, duringCall(), new Set([live.id]), new Set([live.id]))
    expect(next.activeCall).toBeNull()
    expect(next.liveCalls).toEqual([])
  })

  it('does not end a new call when an old hangup is retried', () => {
    const current = duringCall(patient, { ...live, id: 'call-new' })
    const next = appReducer(current, { type: 'END_CALL', callId: live.id })
    expect(next.activeCall?.callId).toBe('call-new')
    expect(next.messages).toEqual(current.messages)
    expect(reconcileCallState(current, next, new Set([live.id]), new Set()).activeCall?.callId).toBe('call-new')
  })
})
