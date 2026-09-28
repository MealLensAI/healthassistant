import { describe, expect, it } from 'vitest'
import { analyzeApplicationText, filterDietitians, validateApplication } from '@/lib/care/domain'
import type { Dietitian } from '@/lib/care/types'

const liveCatalog: Dietitian[] = [
  {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001',
    userId: 'bbbbbbbb-cccc-4ddd-8eee-000000000001',
    name: 'Dr. Ada Okoro',
    title: 'Clinical Dietitian',
    country: 'United States',
    specialties: ['Diabetes', 'IBS', 'Clinical Nutrition'],
    conditions: ['Diabetes', 'IBS', 'Celiac'],
    yearsExperience: 14,
    rating: 4.8,
    reviewCount: 10,
    bio: 'Mediterranean-forward clinical nutrition.',
    languages: ['English'],
    workplace: 'Clinic',
    avatar: '',
    coverImage: '',
    verified: true,
    featured: true,
    education: [],
    experience: [],
    documents: [],
    reviews: [],
    availability: [],
    status: 'approved',
  },
  {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000002',
    userId: 'bbbbbbbb-cccc-4ddd-8eee-000000000002',
    name: 'Amara Nwosu',
    title: 'Dietitian',
    country: 'Italy',
    specialties: ['Weight Management'],
    conditions: [],
    yearsExperience: 8,
    rating: 4.6,
    reviewCount: 5,
    bio: 'Mediterranean eating patterns for families.',
    languages: ['English', 'Italian'],
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
  },
  {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000003',
    userId: 'bbbbbbbb-cccc-4ddd-8eee-000000000003',
    name: 'Dr. Marcus Chen',
    title: 'Dietitian',
    country: 'Canada',
    specialties: ['IBS'],
    conditions: [],
    yearsExperience: 3,
    rating: 0,
    reviewCount: 0,
    bio: 'Pending specialist',
    languages: ['English'],
    workplace: 'Clinic',
    avatar: '',
    coverImage: '',
    verified: false,
    featured: false,
    education: [],
    experience: [],
    documents: [],
    reviews: [],
    availability: [],
    status: 'pending',
  },
]

const demoSeed: Dietitian[] = [
  {
    ...liveCatalog[0],
    id: 'dt-demo',
    userId: 'user-demo',
  },
]

describe('filterDietitians', () => {
  it('hides specialists who are not approved', () => {
    const results = filterDietitians(liveCatalog, {
      query: 'Marcus',
      country: 'all',
      specialty: 'all',
      condition: 'all',
    })
    expect(results).toHaveLength(0)
  })

  it('filters by country and specialty', () => {
    const results = filterDietitians(liveCatalog, {
      query: '',
      country: 'United States',
      specialty: 'Diabetes',
      condition: 'all',
    })
    expect(results.map((item) => item.name)).toEqual(['Dr. Ada Okoro'])
  })

  it('matches query against bio and name', () => {
    const results = filterDietitians(liveCatalog, {
      query: 'mediterranean',
      country: 'all',
      specialty: 'all',
      condition: 'all',
    })
    expect(results.some((item) => item.name.includes('Amara') || item.name.includes('Ada'))).toBe(true)
  })

  it('hides seed/demo ids that were never approved in the live database', () => {
    const results = filterDietitians(demoSeed, {
      query: '',
      country: 'all',
      specialty: 'all',
      condition: 'all',
    })
    expect(results).toHaveLength(0)
  })
})

describe('validateApplication', () => {
  it('requires credential uploads and a complete profile', () => {
    const errors = validateApplication({
      fullName: '',
      email: 'bad',
      phone: '',
      country: '',
      yearsExperience: '',
      bio: 'Too short',
      specialties: [],
      workplace: '',
      languages: '',
      degreeSchool: '',
      degreeTitle: '',
      experience: [{ role: '', org: '', years: '' }],
      education: [{ school: '', degree: '', year: '' }],
      documents: { photo: false, license: false, degree1: false, degree2: false },
    })
    expect(errors.fullName).toBeTruthy()
    expect(errors.email).toBeTruthy()
    expect(errors.license).toBeTruthy()
    expect(errors.degree1).toBeTruthy()
    expect(errors.degree2).toBeTruthy()
    expect(errors.specialties).toBeTruthy()
  })

  it('accepts a complete application', () => {
    const errors = validateApplication({
      fullName: 'Dr. Pending Applicant',
      email: 'marcus@healthyyou.com',
      phone: '1',
      country: 'Canada',
      yearsExperience: '10',
      bio: 'A detailed professional biography that clearly exceeds forty characters for the form.',
      specialties: ['IBS'],
      workplace: 'Clinic',
      languages: 'English',
      degreeSchool: 'UBC',
      degreeTitle: 'MSc',
      experience: [{ role: 'Dietitian', org: 'Clinic', years: 'Current' }],
      education: [{ school: 'UBC', degree: 'MSc', year: '2018' }],
      documents: { photo: true, license: true, degree1: true, degree2: true },
    })
    expect(errors).toEqual({})
  })
})

describe('analyzeApplicationText', () => {
  it('flags a short biography for manual review', () => {
    const result = analyzeApplicationText({
      fullName: 'A',
      bio: 'Short',
      yearsExperience: 1,
      specialties: [],
      workplace: '',
    })
    expect(result.risk).toBe('manual_review')
    expect(result.findings.some((item) => item.status === 'review')).toBe(true)
  })

  it('passes a complete clinical narrative', () => {
    const result = analyzeApplicationText({
      fullName: 'Dr. Ada Okoro',
      bio: 'Registered dietitian with more than a decade of metabolic nutrition practice focused on diabetes and heart health.',
      yearsExperience: 14,
      specialties: ['Diabetes'],
      workplace: 'Pacific Nutrition Clinic',
    })
    expect(result.risk).toBe('low')
  })
})
