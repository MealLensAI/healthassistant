import type { ApplicationDocument, AvailabilitySlot, CredentialDocument, Dietitian, DietitianApplication, User } from '../types'
import { defaultAvailability } from './utils'

export function isImageFileName(fileName: string) {
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(fileName)
}

export function applicantPhotoUrl(
  application: DietitianApplication,
  users: User[],
  dietitians: Dietitian[],
) {
  const photo = application.documents.find((item) => item.kind === 'photo')
  return (
    photo?.url ||
    dietitians.find((item) => item.userId === application.userId)?.avatar ||
    users.find((item) => item.id === application.userId)?.avatar ||
    ''
  )
}

export function specialistReviewFiles(dietitian: Dietitian): CredentialDocument[] {
  const slug = dietitian.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const photo: CredentialDocument = {
    id: `${dietitian.id}-photo`,
    name: 'Profile Photo',
    kind: 'photo',
    fileName: `${slug || 'specialist'}-photo.jpg`,
    url: dietitian.avatar,
  }
  const rest = dietitian.documents.filter((item) => item.kind !== 'photo')
  return dietitian.avatar ? [photo, ...rest] : rest
}

export function downloadNamedFile(
  fileName: string,
  options: { url?: string; title: string; holder: string },
) {
  if (typeof document === 'undefined') return

  if (options.url) {
    const link = document.createElement('a')
    link.href = options.url
    link.download = fileName
    link.target = '_blank'
    link.rel = 'noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
    return
  }

  const body = [
    options.title,
    `Holder: ${options.holder}`,
    `File: ${fileName}`,
    'MealLensAI credential copy for review.',
  ].join('\n')
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(href)
}

export function applicationDocumentKind(kind: ApplicationDocument['kind']): CredentialDocument['kind'] {
  if (kind === 'photo') return 'photo'
  if (kind === 'license') return 'license'
  if (kind === 'cv') return 'cv'
  return 'degree'
}

export function previewDietitianFromApplication(
  application: DietitianApplication,
  photo: string,
  availability?: AvailabilitySlot[],
): Dietitian {
  return {
    id: `preview-${application.id}`,
    userId: application.userId,
    name: application.fullName,
    title: 'Dietitian',
    country: application.country,
    specialties: application.specialties,
    conditions: application.specialties,
    yearsExperience: application.yearsExperience,
    rating: 0,
    reviewCount: 0,
    bio: application.bio,
    languages: application.languages,
    workplace: application.workplace,
    avatar: photo,
    coverImage: '',
    verified: false,
    featured: false,
    education: application.education,
    experience: application.experience ?? [],
    documents: [],
    reviews: [],
    availability: availability?.length ? availability : defaultAvailability(),
    status: 'pending',
  }
}

