import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { accountAvatar } from './accountAvatar'
import type { Dietitian, DietitianApplication, User } from './types'

const dietitian: User = {
  id: 'user-doc',
  name: 'Dr. Test',
  email: 'doc@care.test',
  role: 'dietitian',
  avatar: '',
}

const listing: Dietitian = {
  id: 'dt-test',
  userId: dietitian.id,
  name: 'Dr. Test',
  title: 'Dietitian',
  country: 'Nigeria',
  specialties: [],
  conditions: [],
  yearsExperience: 1,
  rating: 0,
  reviewCount: 0,
  bio: '',
  languages: [],
  workplace: '',
  avatar: 'listing-photo',
  coverImage: '',
  verified: false,
  featured: false,
  education: [],
  experience: [],
  documents: [],
  reviews: [],
  availability: [],
  status: 'pending',
}

const application: DietitianApplication = {
  id: 'app-test',
  userId: dietitian.id,
  fullName: 'Dr. Test',
  email: 'doc@care.test',
  phone: '',
  country: 'Nigeria',
  yearsExperience: 1,
  bio: '',
  specialties: [],
  workplace: '',
  languages: [],
  education: [],
  experience: [],
  documents: [{ kind: 'photo', name: 'Photo', fileName: 'photo.png', uploaded: true, url: 'application-photo' }],
  status: 'pending',
  submittedAt: '2026-09-16T12:00:00.000Z',
  adminNotes: [],
}

test('uses a registered dietitian photo when account avatar is empty', () => {
  assert.equal(accountAvatar({ ...dietitian, avatar: '' }, [listing]), 'listing-photo')
})

test('prefers an updated account photo over the old listing photo', () => {
  assert.equal(accountAvatar({ ...dietitian, avatar: 'new-photo' }, [listing]), 'new-photo')
})

test('uses application photo for a dietitian without a listing', () => {
  assert.equal(accountAvatar({ ...dietitian, avatar: '' }, [], [application]), 'application-photo')
})

test('does not use another dietitian photo or a listing for a patient', () => {
  assert.equal(accountAvatar({ ...dietitian, avatar: '', id: 'different-user' }, [listing]), '')
  assert.equal(accountAvatar({ ...dietitian, avatar: '', role: 'patient' }, [listing]), '')
  assert.equal(accountAvatar(null, [listing]), '')
})
