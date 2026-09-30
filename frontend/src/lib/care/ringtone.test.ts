import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { CallRingtone } from './ringtone'

function audioStub() {
  let playing = false
  const plays: number[] = []
  const audio = {
    loop: false,
    currentTime: 0,
    get paused() {
      return !playing
    },
    async play() {
      plays.push(1)
      playing = true
    },
    pause() {
      playing = false
    },
  }
  return {
    audio,
    plays,
    create: () => audio,
  }
}

test('audio unlocked before the call rings immediately and stops on answer', async () => {
  const stub = audioStub()
  const ringtone = new CallRingtone('/sounds/test.mp3', stub.create)
  await ringtone.unlock()
  assert.equal(stub.plays.length, 1)
  assert.equal(stub.audio.paused, true)
  assert.equal(ringtone.start(), true)
  assert.equal(stub.audio.loop, true)
  assert.equal(stub.audio.paused, false)
  ringtone.stop()
  assert.equal(stub.audio.paused, true)
  assert.equal(stub.audio.currentTime, 0)
  ringtone.dispose()
})

test('blocked incoming sound can be enabled and reuses the same audio element', async () => {
  const stub = audioStub()
  let created = 0
  const ringtone = new CallRingtone('/sounds/test.mp3', () => {
    created++
    return stub.create()
  })
  // start() before unlock — play may reject in real browsers; stub succeeds so unlocked becomes true after promise.
  assert.equal(ringtone.start(), false)
  await ringtone.unlock()
  assert.equal(created, 1)
  await ringtone.unlock()
  assert.equal(created, 1)
  ringtone.dispose()
})
