import { describe, expect, it } from 'vitest'
import { isDietitianMarketplaceApproved } from '@/lib/care/dietitianMarketplace'
import type { Dietitian } from '@/lib/care/types'

const approved: Dietitian = {
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001',
  userId: 'bbbbbbbb-cccc-4ddd-8eee-000000000001',
  name: 'Dr. Approved',
  title: 'Dietitian',
  country: 'Nigeria',
  specialties: ['Diabetes'],
  conditions: [],
  yearsExperience: 5,
  rating: 5,
  reviewCount: 1,
  bio: 'Approved specialist',
  languages: ['English'],
  workplace: 'Clinic',
  avatar: '',
  coverImage: '',
  verified: true,
  featured: false,
  education: [],
  experience: [],
  documents: [],
  reviews: [],
  availability: [],
  status: 'approved',
}

const pending: Dietitian = {
  ...approved,
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000002',
  userId: 'bbbbbbbb-cccc-4ddd-8eee-000000000002',
  name: 'Dr. Pending',
  status: 'pending',
  verified: false,
}

describe('dietitianMarketplace', () => {
  it('treats approved listings as marketplace-open', () => {
    expect(isDietitianMarketplaceApproved([approved, pending], approved.userId)).toBe(true)
  })

  it('keeps pending applicants locked out of marketplace tools', () => {
    expect(isDietitianMarketplaceApproved([approved, pending], pending.userId)).toBe(false)
  })
})
