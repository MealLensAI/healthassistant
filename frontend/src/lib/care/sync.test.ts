import { describe, expect, it } from 'vitest'
import { mergeCarePulse, mergeServerPatch } from './api'
import { createInitialState } from './store'
import { peerProfilePath } from './profilePaths'
import type { Appointment, Dietitian, User } from './types'

const patient: User = { id: 'patient', role: 'patient', name: 'Pat', email: 'pat@example.com', avatar: '' }
const doctor: User = { id: 'doctor', role: 'dietitian', name: 'Doc', email: 'doc@example.com', avatar: '' }
const appointment: Appointment = { id: 'appointment', patientId: patient.id, dietitianId: 'listing', status: 'upcoming', date: '2026-10-12', time: '10:00', type: 'video', topic: 'Consult' }

describe('report regressions', () => {
  it('removes a deleted appointment immediately from a server patch', () => {
    const initial = createInitialState({ currentUser: patient, appointments: [appointment] })
    const next = mergeServerPatch(initial, { patch: { appointments: [{ ...appointment, status: 'deleted' }] } })
    expect(next.appointments).toEqual([])
  })
  it('loads new peers and remote appointment status without replacing message history', () => {
    const initial = createInitialState({ currentUser: doctor, appointments: [appointment] })
    const next = mergeCarePulse(initial, { users: [patient], conversations: [], notifications: [], missedCalls: [], liveCalls: [], appointments: [{ ...appointment, status: 'completed' }] })
    expect(next.users.find((user) => user.id === patient.id)?.name).toBe('Pat')
    expect(next.appointments[0].status).toBe('completed')
    expect(next.messages).toEqual(initial.messages)
  })
  it('clears the active call when pulse reports the peer hung up', () => {
    const live = {
      id: 'call-1',
      conversationId: 'conv-1',
      callerId: doctor.id,
      calleeId: patient.id,
      callerName: doctor.name,
      callerAvatar: '',
      calleeName: patient.name,
      calleeAvatar: '',
      status: 'live' as const,
      startedAt: new Date().toISOString(),
      offer: null,
      answer: null,
      ice: [],
    }
    const initial = createInitialState({
      currentUser: doctor,
      liveCalls: [live],
      activeCall: {
        conversationId: live.conversationId,
        peerId: patient.id,
        peerName: patient.name,
        peerAvatar: '',
        status: 'live',
        incoming: false,
        callId: live.id,
      },
    })
    const next = mergeCarePulse(initial, {
      users: [],
      conversations: [],
      notifications: [],
      missedCalls: [],
      liveCalls: [],
      appointments: [],
    })
    expect(next.liveCalls).toEqual([])
    expect(next.activeCall).toBeNull()
  })
  it('links the dietitian avatar to the public site profile', () => {
    const listing = { id: 'listing', userId: doctor.id } as Dietitian
    expect(peerProfilePath({ currentUser: patient, peerUserId: doctor.id, dietitians: [listing], users: [doctor] })).toBe('/dietitians/listing')
  })
})
