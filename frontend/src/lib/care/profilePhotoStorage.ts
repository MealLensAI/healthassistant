const PROFILE_PHOTO_KEY = 'meallensai.profile_photo'

export function readStoredProfilePhoto(userId?: string): string {
  // Never read the legacy global key: its owner is unknown.
  if (!userId) return ''
  try {
    return localStorage.getItem(`${PROFILE_PHOTO_KEY}.${userId}`) || ''
  } catch {
    return ''
  }
}

export function writeStoredProfilePhoto(dataUrl: string, userId?: string) {
  if (!userId) return
  localStorage.setItem(`${PROFILE_PHOTO_KEY}.${userId}`, dataUrl)
}
