import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { CallRingtone } from './ringtone'

function audioStub() {
  const tones: { stops: number; type?: string; frequency: { value: number } }[] = []
  const context = {
    state: 'suspended',
    currentTime: 0,
    destination: {},
    async resume() {
      this.state = 'running'
    },
    async close() {
      this.state = 'closed'
    },
    createOscillator() {
      const tone = {
        stops: 0,
        type: 'sine',
        frequency: { value: 0 },
        onended: null as (() => void) | null,
        connect: () => ({ connect() {} }),
        disconnect() {},
        start() {},
        stop() {
          this.stops++
        },
      }
      tones.push(tone)
      return tone
    },
    createGain: () => ({
      gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
      disconnect() {},
    }),
  }
  return { tones, context, create: () => context as unknown as AudioContext }
}

test('audio unlocked before the call rings immediately and stops on answer', async () => {
  const stub = audioStub()
  const ringtone = new CallRingtone(stub.create)
  await ringtone.unlock()
  assert.equal(stub.tones.length, 0)
  assert.equal(ringtone.start(), true)
  // 8 melody notes × fundamental + octave body
  assert.equal(stub.tones.length, 16)
  ringtone.stop()
  assert.ok(stub.tones.every((tone) => tone.stops >= 1))
  ringtone.dispose()
})

test('blocked incoming sound can be enabled and reuses the same audio context', async () => {
  const stub = audioStub()
  let created = 0
  const ringtone = new CallRingtone(() => {
    created++
    return stub.create()
  })
  assert.equal(ringtone.start(), false)
  assert.equal(stub.tones.length, 0)
  await ringtone.unlock()
  assert.equal(stub.tones.length, 16)
  await ringtone.unlock()
  assert.equal(created, 1)
  ringtone.dispose()
  assert.equal(stub.context.state, 'closed')
})
