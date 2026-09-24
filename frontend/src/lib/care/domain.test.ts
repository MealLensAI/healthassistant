import { describe, expect, it } from 'vitest'
import { DIETITIANS } from '@/lib/care/data/mock'
import { analyzeApplicationText, filterDietitians, validateApplication } from '@/lib/care/domain'

describe('filterDietitians', () => {
  it('hides specialists who are not approved', () => {
    const results = filterDietitians(DIETITIANS, {
      query: 'Marcus',
      country: 'all',
      specialty: 'all',
      condition: 'all',
    })
    expect(results).toHaveLength(0)
  })

  it('filters by country and specialty', () => {
    const results = filterDietitians(DIETITIANS, {
      query: '',
      country: 'United States',
      specialty: 'Diabetes',
      condition: 'all',
    })
    expect(results.map((item) => item.id)).toEqual(['dt-emily'])
  })

  it('matches query against bio and name', () => {
    const results = filterDietitians(DIETITIANS, {
      query: 'mediterranean',
      country: 'all',
      specialty: 'all',
      condition: 'all',
    })
    expect(results.some((item) => item.id === 'dt-maria' || item.id === 'dt-elena')).toBe(true)
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
      fullName: 'Dr. Marcus Chen',
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
      fullName: 'Dr. Emily Carter',
      bio: 'Registered dietitian with more than a decade of metabolic nutrition practice focused on diabetes and heart health.',
      yearsExperience: 14,
      specialties: ['Diabetes'],
      workplace: 'Pacific Nutrition Clinic',
    })
    expect(result.risk).toBe('low')
  })
})
