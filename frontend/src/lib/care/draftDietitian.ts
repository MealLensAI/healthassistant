import type { Dietitian, DietitianApplication, User } from '@/lib/care/types'
import { defaultAvailability } from '@/lib/care/utils'

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=80'

/**
 * Build a dashboard/profile listing for the signed-in dietitian when they
 * don't have an approved public listing yet — uses their real account data.
 */
export function draftDietitianFromUser(
  user: User,
  application?: DietitianApplication | null,
): Dietitian {
  const name = application?.fullName || user.name
  const specialties = application?.specialties?.length
    ? application.specialties
    : ['Clinical Nutrition']
  const yearsExperience = Number(application?.yearsExperience) || 0
  const languages = application?.languages?.length ? application.languages : ['English']

  return {
    id: `draft-${user.id}`,
    userId: user.id,
    name,
    title: user.title || 'Clinical Dietitian',
    country: application?.country || user.country || 'United States',
    specialties,
    conditions: specialties,
    yearsExperience,
    rating: 0,
    reviewCount: 0,
    bio:
      application?.bio ||
      'I help patients translate clinical nutrition goals into meals they can keep. Complete registration to publish your full bio.',
    languages,
    workplace: application?.workplace || 'Your practice',
    avatar: user.avatar || '',
    coverImage: DEFAULT_COVER,
    verified: false,
    featured: false,
    education: application?.education ?? [],
    experience: application?.experience ?? [],
    documents: [
      { id: 'doc-photo', name: 'Profile Photo', kind: 'photo', fileName: 'photo.jpg', url: user.avatar || undefined },
      { id: 'doc-license', name: 'Practice License', kind: 'license', fileName: 'license.pdf' },
      { id: 'doc-degree-1', name: 'University Degree 1', kind: 'degree', fileName: 'degree-1.pdf' },
      { id: 'doc-degree-2', name: 'University Degree 2', kind: 'degree', fileName: 'degree-2.pdf' },
    ],
    reviews: [],
    availability: defaultAvailability(),
    status: 'pending',
  }
}
