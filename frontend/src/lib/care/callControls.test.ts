import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { CallControls, hasLiveVideo, notifyLocalCallEnded, subscribeLocalCallEnded } from './callControls'

class Channel extends EventTarget {
  readyState = 'connecting'
  peer?: Channel
  sent: string[] = []
  send(data: string) {
    this.sent.push(data)
    this.peer?.dispatchEvent(new MessageEvent('message', { data }))
  }
  open() {
    this.readyState = 'open'
    this.dispatchEvent(new Event('open'))
  }
  asRTC() { return this as unknown as RTCDataChannel }
}

test('both peers receive camera off/on, including a toggle before connecting', () => {
  const callerUpdates: boolean[] = []
  const calleeUpdates: boolean[] = []
  const caller = new CallControls('call-1', (enabled) => callerUpdates.push(enabled), () => {})
  const callee = new CallControls('call-1', (enabled) => calleeUpdates.push(enabled), () => {})
  const left = new Channel()
  const right = new Channel()
  left.peer = right
  right.peer = left
  caller.attach(left.asRTC())
  callee.attach(right.asRTC())
  caller.setCamera(true)
  caller.setCamera(false)
  callee.setCamera(true)
  left.open()
  right.open()
  assert.deepEqual(calleeUpdates, [false])
  assert.deepEqual(callerUpdates, [true])
  caller.setCamera(true)
  callee.setCamera(false)
  callee.setCamera(true)
  assert.deepEqual(calleeUpdates, [false, true])
  assert.deepEqual(callerUpdates, [true, false, true])
  caller.dispose()
  callee.dispose()
})

test('hangup reaches the peer once and late camera messages cannot revive it', () => {
  let ended = 0
  const cameraUpdates: boolean[] = []
  const caller = new CallControls('call-1', () => {}, () => {})
  const callee = new CallControls('call-1', (enabled) => cameraUpdates.push(enabled), () => { ended++ })
  const left = new Channel()
  const right = new Channel()
  left.peer = right
  right.peer = left
  caller.attach(left.asRTC())
  callee.attach(right.asRTC())
  left.open()
  right.open()
  caller.hangup()
  caller.hangup()
  caller.setCamera(true)
  right.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'camera', callId: 'call-1', enabled: true }) }))
  assert.equal(ended, 1)
  assert.deepEqual(cameraUpdates, [false])
  assert.equal(left.sent.filter((data) => JSON.parse(data).type === 'hangup').length, 1)
})

test('ignores malformed control messages and messages for another call', () => {
  let cameraUpdates = 0
  let ended = 0
  const controls = new CallControls('current', () => { cameraUpdates++ }, () => { ended++ })
  const channel = new Channel()
  controls.attach(channel.asRTC())
  for (const data of ['garbage', 'null', '{"type":"camera","callId":"current","enabled":"false"}', '{"type":"hangup","callId":"older"}']) {
    channel.dispatchEvent(new MessageEvent('message', { data }))
  }
  assert.equal(cameraUpdates, 0)
  assert.equal(ended, 0)
  controls.dispose()
  channel.dispatchEvent(new MessageEvent('message', { data: '{"type":"hangup","callId":"current"}' }))
  assert.equal(ended, 0)
})

test('local hangup subscription runs synchronously and can be removed', () => {
  const calls: string[] = []
  const unsubscribe = subscribeLocalCallEnded((id) => calls.push(id))
  notifyLocalCallEnded('call-1')
  assert.deepEqual(calls, ['call-1'])
  unsubscribe()
  notifyLocalCallEnded('call-2')
  assert.deepEqual(calls, ['call-1'])
})

test('audio-only, disabled, muted and ended cameras all use the fallback tile', () => {
  const track = { readyState: 'live', enabled: true, muted: false }
  const stream = { getVideoTracks: () => [track] } as unknown as MediaStream
  assert.equal(hasLiveVideo(stream), true)
  track.enabled = false
  assert.equal(hasLiveVideo(stream), false)
  track.enabled = true
  track.muted = true
  assert.equal(hasLiveVideo(stream), false)
  track.muted = false
  track.readyState = 'ended'
  assert.equal(hasLiveVideo(stream), false)
  assert.equal(hasLiveVideo({ getVideoTracks: () => [] } as unknown as MediaStream), false)
  assert.equal(hasLiveVideo(null), false)
})
