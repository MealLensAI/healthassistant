import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readStoredProfilePhoto, writeStoredProfilePhoto } from './profilePhotoStorage.ts'

test('photos stay with their owner across account switches and reloads', () => {
  const values = new Map([['meallensai.profile_photo', 'legacy-other-person']])
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } })
  assert.equal(readStoredProfilePhoto('new-patient'), '')
  assert.equal(readStoredProfilePhoto(), '')
  writeStoredProfilePhoto('alice-photo', 'alice')
  writeStoredProfilePhoto('bob-photo', 'bob')
  assert.equal(readStoredProfilePhoto('alice'), 'alice-photo')
  assert.equal(readStoredProfilePhoto('bob'), 'bob-photo')
  assert.equal(readStoredProfilePhoto('new-patient'), '')
  writeStoredProfilePhoto('alice-updated', 'alice')
  assert.equal(readStoredProfilePhoto('alice'), 'alice-updated')
  assert.equal(readStoredProfilePhoto('bob'), 'bob-photo')
  Reflect.deleteProperty(globalThis, 'localStorage')
})
