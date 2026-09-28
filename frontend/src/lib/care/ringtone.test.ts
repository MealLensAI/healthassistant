import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { CallRingtone } from './ringtone'

function audioStub() {
  const tones: { stops: number }[] = []
  const context = {
    state: 'suspended', currentTime: 0, destination: {},
    async resume() { this.state = 'running' },
    async close() { this.state = 'closed' },
    createOscillator() {
      const tone = { stops: 0, frequency: { value: 0 }, onended: null, connect: () => ({ connect() {} }), disconnect() {}, start() {}, stop() { this.stops++ } }
      tones.push(tone)
      return tone
    },
    createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, disconnect() {} }),
  }
  return { tones, context, create: () => context as unknown as AudioContext }
}

test('audio unlocked before the call rings immediately and stops on answer', async () => {
  const stub = audioStub()
  const ringtone = new CallRingtone(stub.create)
  await ringtone.unlock()
  assert.equal(stub.tones.length, 0)
  assert.equal(ringtone.start(), true)
  assert.equal(stub.tones.length, 4)
  ringtone.stop()
  assert.ok(stub.tones.every((tone) => tone.stops === 2))
  ringtone.dispose()
})

test('blocked incoming sound can be enabled and reuses the same audio context', async () => {
  const stub = audioStub()
  let created = 0
  const ringtone = new CallRingtone(() => { created++; return stub.create() })
  assert.equal(ringtone.start(), false)
  assert.equal(stub.tones.length, 0)
  await ringtone.unlock()
  assert.equal(stub.tones.length, 4)
  await ringtone.unlock()
  assert.equal(created, 1)
  ringtone.dispose()
  assert.equal(stub.context.state, 'closed')
})
