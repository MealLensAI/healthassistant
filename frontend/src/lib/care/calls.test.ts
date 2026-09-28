import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { activeCallFromLive, withCallPeerAvatar } from './calls'
import type { Dietitian, LiveCall, User, VideoCallState } from './types'

test('each participant sees the other participant’s own name and photo', () => {
  const call: LiveCall = {
    id: 'call-1', conversationId: 'conversation-1', status: 'live', startedAt: '',
    callerId: 'patient', callerName: 'Patient Name', callerAvatar: '/patient.png',
    calleeId: 'dietitian', calleeName: 'Dietitian Name', calleeAvatar: '/dietitian.png',
  }
  const patientView = activeCallFromLive('patient', [call])
  const dietitianView = activeCallFromLive('dietitian', [call])
  assert.equal(patientView?.peerName, 'Dietitian Name')
  assert.equal(patientView?.peerAvatar, '/dietitian.png')
  assert.equal(dietitianView?.peerName, 'Patient Name')
  assert.equal(dietitianView?.peerAvatar, '/patient.png')
})

test('a person with no photo cannot inherit a previous call participant’s picture', () => {
  const call: LiveCall = {
    id: 'call-new', conversationId: 'conversation-new', status: 'live', startedAt: '',
    callerId: 'patient', callerName: 'Patient Name', callerAvatar: '',
    calleeId: 'dietitian-new', calleeName: 'New Dietitian', calleeAvatar: '',
  }
  const next = activeCallFromLive('patient', [call], {
    callId: 'call-old', conversationId: 'conversation-old', peerId: 'dietitian-old',
    peerName: 'Old Dietitian', peerAvatar: '/old-photo.png',
  })
  assert.equal(next?.peerName, 'New Dietitian')
  assert.equal(next?.peerAvatar, '')
})

test('camera-off doctor tile resolves a listing-only photo by account ID, never listing ID', () => {
  const doctor: User = { id: 'doctor-account', name: 'Dr. Lee', email: '', role: 'dietitian', avatar: '' }
  const patient: User = { id: 'patient', name: 'Patient', email: '', role: 'patient', avatar: '/patient.png' }
  const listings = [
    { id: 'doctor-account', userId: 'another-account', avatar: '/wrong.png' },
    { id: 'listing-123', userId: doctor.id, avatar: '/doctor.png' },
  ] as Dietitian[]
  const call: VideoCallState = { callId: 'call', conversationId: 'conv', peerId: doctor.id, peerName: doctor.name, peerAvatar: '' }
  assert.equal(withCallPeerAvatar(call, [patient, doctor], listings)?.peerAvatar, '/doctor.png')
  assert.equal(withCallPeerAvatar({ ...call, peerId: patient.id }, [patient, doctor], listings)?.peerAvatar, '/patient.png')
  assert.equal(withCallPeerAvatar(call, [{ ...doctor, avatar: '/new.png' }], listings)?.peerAvatar, '/new.png')
  assert.equal(withCallPeerAvatar(call, [doctor], [listings[0]])?.peerAvatar, '')
})
