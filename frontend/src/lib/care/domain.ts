import type { Dietitian, EducationItem, ExperienceItem, SearchFilters } from '@/lib/care/types'

export function filterDietitians(dietitians: Dietitian[], filters: SearchFilters) {
  const query = filters.query.trim().toLowerCase()

  return dietitians.filter((dietitian) => {
    if (dietitian.status !== 'approved') return false

    if (query) {
      const haystack = [
        dietitian.name,
        dietitian.title,
        dietitian.country,
        dietitian.bio,
        ...dietitian.specialties,
        ...dietitian.conditions,
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }

    if (filters.country !== 'all' && dietitian.country !== filters.country) {
      return false
    }

    if (filters.specialty !== 'all' && !dietitian.specialties.includes(filters.specialty)) {
      return false
    }

    if (filters.condition !== 'all' && !dietitian.conditions.includes(filters.condition)) {
      return false
    }

    return true
  })
}

export function uniqueValues(dietitians: Dietitian[], key: 'country' | 'specialties' | 'conditions') {
  const values = new Set<string>()
  for (const dietitian of dietitians) {
    if (dietitian.status !== 'approved') continue
    const value = dietitian[key]
    if (Array.isArray(value)) {
      value.forEach((item) => values.add(item))
    } else {
      values.add(value)
    }
  }
  return [...values].sort()
}

export interface ApplicationDraft {
  fullName: string
  email: string
  phone: string
  country: string
  yearsExperience: string
  bio: string
  specialties: string[]
  workplace: string
  languages: string
  degreeSchool: string
  degreeTitle: string
  experience: ExperienceItem[]
  education: EducationItem[]
  documents: {
    photo: boolean
    license: boolean
    degree1: boolean
    degree2: boolean
  }
}

export function validateApplication(draft: ApplicationDraft) {
  const errors: Record<string, string> = {}

  if (!draft.fullName.trim()) errors.fullName = 'Full name is required.'
  if (!draft.email.trim() || !draft.email.includes('@')) errors.email = 'A valid email is required.'
  if (!draft.country.trim()) errors.country = 'Country is required.'
  if (!draft.yearsExperience || Number(draft.yearsExperience) < 0) {
    errors.yearsExperience = 'Years of experience is required.'
  }
  if (draft.bio.trim().length < 40) errors.bio = 'Please add a biography of at least 40 characters.'
  if (draft.specialties.length === 0) errors.specialties = 'Select at least one specialty.'
  if (!draft.documents.license) errors.license = 'Practice license PDF is required.'
  if (!draft.documents.degree1) errors.degree1 = 'University degree 1 PDF is required.'
  if (!draft.documents.degree2) errors.degree2 = 'University degree 2 PDF is required.'

  return errors
}

export function analyzeApplicationText(input: {
  fullName: string
  bio: string
  yearsExperience: number
  specialties: string[]
  workplace: string
}) {
  const findings: Array<{ label: string; status: 'pass' | 'review'; detail: string }> = []

  findings.push({
    label: 'Identity consistency',
    status: input.fullName.trim().length > 3 ? 'pass' : 'review',
    detail: input.fullName.trim().length > 3
      ? 'Applicant name is complete and internally consistent.'
      : 'Name appears incomplete.',
  })

  findings.push({
    label: 'Biography professionalism',
    status: input.bio.length >= 80 ? 'pass' : 'review',
    detail: input.bio.length >= 80
      ? 'Narrative is sufficiently detailed for a clinical profile.'
      : 'Biography is short. Request additional professional history.',
  })

  findings.push({
    label: 'Experience alignment',
    status: input.yearsExperience >= 2 ? 'pass' : 'review',
    detail: `${input.yearsExperience} years reported${input.workplace ? ` at ${input.workplace}` : ''}.`,
  })

  findings.push({
    label: 'Specialty specificity',
    status: input.specialties.length >= 1 ? 'pass' : 'review',
    detail: input.specialties.length
      ? `Listed specialties: ${input.specialties.join(', ')}.`
      : 'No specialties provided.',
  })

  const risk = findings.some((item) => item.status === 'review') ? 'manual_review' : 'low'
  return { risk, findings }
}
