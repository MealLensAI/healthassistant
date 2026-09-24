import type { ApplicationDocument, CredentialDocument, Dietitian, DietitianApplication, User } from '@/lib/care/types'
import { defaultAvailability } from '@/lib/care/utils'

function credentialKind(kind: ApplicationDocument['kind']): CredentialDocument['kind'] {
  if (kind === 'photo') return 'photo'
  if (kind === 'license') return 'license'
  if (kind === 'degree1' || kind === 'degree2') return 'degree'
  return 'cv'
}

/** Only credentials the specialist actually uploaded (with a file URL). */
export function uploadedCredentialsFromApplication(
  application?: DietitianApplication | null,
): CredentialDocument[] {
  if (!application?.documents?.length) return []
  return application.documents
    .filter((doc) => Boolean(doc.uploaded && doc.url))
    .map((doc, index) => ({
      id: `doc-${doc.kind}-${index}`,
      name: doc.name,
      kind: credentialKind(doc.kind),
      fileName: doc.fileName,
      url: doc.url,
    }))
}

function filledExperience(application?: DietitianApplication | null) {
  return (application?.experience ?? []).filter((item) => item.role?.trim() && item.org?.trim())
}

function filledEducation(application?: DietitianApplication | null) {
  return (application?.education ?? []).filter((item) => item.school?.trim() && item.degree?.trim())
}

/**
 * Build a dashboard/profile listing for the signed-in dietitian when they
 * don't have an approved public listing yet — only real account / application data.
 * Never invent bio, location, specialties, cover, or credentials.
 */
export function draftDietitianFromUser(
  user: User,
  application?: DietitianApplication | null,
): Dietitian {
  const name = application?.fullName?.trim() || user.name
  const specialties = application?.specialties?.filter((item) => item.trim()) ?? []
  const languages = application?.languages?.filter((item) => item.trim()) ?? []
  const yearsExperience = Number(application?.yearsExperience) || 0

  return {
    id: `draft-${user.id}`,
    userId: user.id,
    name,
    title: (user.title || '').trim(),
    country: (application?.country || user.country || '').trim(),
    specialties,
    conditions: specialties,
    yearsExperience,
    rating: 0,
    reviewCount: 0,
    bio: (application?.bio || '').trim(),
    languages,
    workplace: (application?.workplace || '').trim(),
    avatar: user.avatar || '',
    coverImage: '',
    verified: false,
    featured: false,
    education: filledEducation(application),
    experience: filledExperience(application),
    documents: uploadedCredentialsFromApplication(application),
    reviews: [],
    availability: defaultAvailability(),
    status: application?.status === 'needs_info' ? 'needs_info' : 'pending',
  }
}
